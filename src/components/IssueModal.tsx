"use client";

import React, { useState, useEffect } from "react";
import { Sport, EquipmentType, InventoryItem, User, EquipmentIssue } from "@/types";
import { getLiabilityDisclaimer } from "@/lib/date-utils";
import { X, ChevronRight, Check, AlertTriangle, ShieldCheck, ArrowLeft } from "lucide-react";

interface IssueModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (newIssue?: EquipmentIssue) => void;
}

export default function IssueModal({ user, onClose, onSuccess }: IssueModalProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [sports, setSports] = useState<Sport[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);

  // Selection states
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedEqType, setSelectedEqType] = useState<EquipmentType | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);

  // Fetch sports on load
  useEffect(() => {
    async function loadSports() {
      try {
        const res = await fetch("/api/sports");
        const data = await res.json();
        if (data.sports) setSports(data.sports);
        if (data.equipmentTypes) setEquipmentTypes(data.equipmentTypes);
      } catch {
        setError("Failed to load sports list. Please try again.");
      }
    }
    loadSports();
  }, []);

  // When sport changes, filter equipment types
  const sportEquipmentTypes = selectedSport
    ? equipmentTypes.filter((eq) => eq.sport_id === selectedSport.id)
    : [];

  // When sport and eqType are chosen, fetch available physical items
  const loadAvailableItems = async (sportId: string, eqTypeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/available?sportId=${sportId}&equipmentTypeId=${eqTypeId}`);
      const data = await res.json();
      if (res.ok && data.items) {
        setAvailableItems(data.items);
      } else {
        setError(data.error || "Unable to fetch available equipment items.");
      }
    } catch {
      setError("Network error while checking inventory availability.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSport = (sport: Sport) => {
    setSelectedSport(sport);
    setSelectedEqType(null);
    setSelectedItem(null);
    setStep(2);
  };

  const handleSelectEqType = (eqType: EquipmentType) => {
    setSelectedEqType(eqType);
    setSelectedItem(null);
    if (selectedSport) {
      loadAvailableItems(selectedSport.id, eqType.id);
    }
    setStep(3);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setStep(4);
  };

  const handleSubmitIssue = async () => {
    if (loading) return;
    if (!selectedItem) {
      setError("Please select an equipment item.");
      return;
    }
    if (!disclaimerAccepted) {
      setError("You must acknowledge and accept the liability disclaimer to proceed.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/issues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          inventoryItemId: selectedItem.id,
          disclaimerAcknowledged: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to issue equipment.");
        setLoading(false);
        return;
      }

      onSuccess(data.issue);
    } catch {
      setError("An unexpected network error occurred while submitting your request.");
      setLoading(false);
    }
  };

  const disclaimerText = getLiabilityDisclaimer(new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0B2545] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-red-400">
                Step {step} of 4
              </span>
              <h3 className="text-lg font-bold leading-tight">
                {step === 1 && "Select Sport"}
                {step === 2 && `Select ${selectedSport?.name} Equipment`}
                {step === 3 && "Select Specific Item"}
                {step === 4 && "Liability Disclaimer & Confirmation"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Select Sport */}
          {step === 1 && (
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Choose the sport for which you require equipment:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {sports.map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSelectSport(sport)}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-red-600 hover:bg-red-50/40 text-slate-800 font-medium text-sm transition text-center shadow-sm active:scale-95 group"
                  >
                    <span className="font-semibold group-hover:text-red-700">{sport.name}</span>
                    <span className="text-[11px] text-slate-400 group-hover:text-red-500 mt-0.5">Select sport</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Select Equipment Type */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Selected Sport:</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-medium rounded-md">
                  {selectedSport?.name}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Choose the equipment type you wish to borrow:
              </p>

              {sportEquipmentTypes.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  No equipment types currently configured for this sport.
                </div>
              ) : (
                <div className="space-y-2">
                  {sportEquipmentTypes.map((eq) => (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => handleSelectEqType(eq)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-[#0B2545] hover:bg-slate-50 text-slate-800 font-medium text-sm transition text-left shadow-sm group"
                    >
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-[#0B2545]">{eq.name}</p>
                        <p className="text-xs text-slate-500">Standard issue item</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0B2545] group-hover:translate-x-0.5 transition" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Select Specific Physical Item Number */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span>{selectedSport?.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{selectedEqType?.name}</span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Select an available physical item number:
                </p>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {availableItems.length} Available
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Checking current equipment availability...
                </div>
              ) : availableItems.length === 0 ? (
                <div className="p-6 text-center bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                  <p className="text-sm font-semibold">All items currently in use</p>
                  <p className="text-xs text-amber-800">
                    All numbered items for {selectedEqType?.name} are currently issued or undergoing inspection. Please check back later or choose another sport.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="p-3 rounded-xl border-2 border-slate-200 hover:border-red-600 hover:bg-red-50 text-slate-800 font-bold text-center transition shadow-sm active:scale-95"
                    >
                      <span className="text-base text-slate-900">{item.equipment_number}</span>
                      <span className="block text-[10px] font-medium text-emerald-600 uppercase mt-0.5">
                        Available
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Liability Disclaimer & Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Issue Summary
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Student</span>
                    <span className="text-slate-900 font-bold">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">FLAME Email</span>
                    <span className="text-slate-900">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Equipment</span>
                    <span className="text-slate-900 font-bold">
                      {selectedSport?.name} — {selectedEqType?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Item Number</span>
                    <span className="text-red-700 font-extrabold text-sm">
                      {selectedItem?.equipment_number}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Return Deadline</span>
                    <span className="text-[#0B2545] font-bold">
                      11:00 PM IST Today
                    </span>
                  </div>
                </div>
              </div>

              {/* Mandatory Liability Disclaimer */}
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3">
                <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  FLAME Sports Department Liability Disclaimer
                </div>
                <blockquote className="text-xs text-slate-700 leading-relaxed italic border-l-2 border-red-500 pl-3">
                  &ldquo;{disclaimerText}&rdquo;
                </blockquote>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-900">
                    I acknowledge that I am responsible for this equipment and agree to return it by 11:00 PM IST today.
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSubmitIssue}
                disabled={!disclaimerAccepted || loading}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
              >
                {loading ? (
                  "Processing Issue..."
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Issue Equipment
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
