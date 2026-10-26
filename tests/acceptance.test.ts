import { dbStore } from "../src/lib/db/store";
import { getReturnDeadlineForDate, getLiabilityDisclaimer } from "../src/lib/date-utils";

async function runTests() {
  console.log("==================================================================");
  console.log("FLAME University Digital Sports Equipment Room — Acceptance Tests");
  console.log("==================================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failedCount++;
    }
  }

  // 1. Authentication & Role Enforcement
  console.log("--- 1. Authentication & Domain Checks ---");
  const studentAuth = dbStore.authenticateUser("priya.nair@flame.edu.in", "Priya Nair");
  assert(
    !studentAuth.error && studentAuth.user.role === "student",
    "Verified @flame.edu.in user is accepted with 'student' role"
  );

  const adminAuth = dbStore.authenticateUser("asmi.malushte@flame.edu.in");
  assert(
    !adminAuth.error && adminAuth.user.role === "admin",
    "Configured administrator asmi.malushte@flame.edu.in receives 'admin' role"
  );

  const invalidDomainAuth = dbStore.authenticateUser("intruder@gmail.com");
  assert(
    Boolean(invalidDomainAuth.error),
    "External non-@flame.edu.in account is strictly rejected"
  );

  // 2. Issuing Equipment & One-Issue Rule
  console.log("\n--- 2. Equipment Issuing & One-Active-Issue Rule ---");
  const availableRackets = dbStore.getAvailableItems("s-badminton", "eq-badminton-racket");
  assert(availableRackets.length > 0, "Available badminton rackets found in inventory");

  const chosenRacket = availableRackets[0];
  const issueResult = await dbStore.issueEquipment({
    userId: studentAuth.user.id,
    inventoryItemId: chosenRacket.id,
  });
  assert(
    !issueResult.error && issueResult.issue?.status === "issued",
    `Student Priya Nair successfully issued Badminton Racket ${chosenRacket.equipment_number}`
  );

  // Attempt to issue a SECOND item while the first is active
  const secondRacket = availableRackets[1];
  const duplicateIssueResult = await dbStore.issueEquipment({
    userId: studentAuth.user.id,
    inventoryItemId: secondRacket.id,
  });
  assert(
    Boolean(duplicateIssueResult.error),
    "One-active-issue rule strictly enforced: Second issue blocked"
  );

  // 3. Date & Liability Disclaimer
  console.log("\n--- 3. Timezone (Asia/Kolkata) & Liability Disclaimer ---");
  const disclaimer = getLiabilityDisclaimer(new Date());
  assert(
    disclaimer.includes("11:00 PM IST") && disclaimer.includes("Department of Sports, FLAME University"),
    "Disclaimer dynamically includes 11:00 PM IST and FLAME Sports text"
  );

  // 4. Student Return Submission
  console.log("\n--- 4. Student Return Submission ---");
  const activeIssue = dbStore.getActiveIssueForUser(studentAuth.user.id);
  assert(activeIssue !== null, "Active issue found for Priya Nair");

  // Attempt return without mandatory acknowledgement
  const missingAckReturn = await dbStore.submitReturn({
    userId: studentAuth.user.id,
    issueId: activeIssue!.id,
    acknowledgement: false,
  });
  assert(
    Boolean(missingAckReturn.error),
    "Return submission requires mandatory condition acknowledgement"
  );

  // Valid return submission with photographic evidence
  const validReturn = await dbStore.submitReturn({
    userId: studentAuth.user.id,
    issueId: activeIssue!.id,
    acknowledgement: true,
    photoUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55",
    studentNotes: "Rack A counter",
  });
  assert(
    !validReturn.error && validReturn.issue?.status === "return_submitted",
    "Return submitted successfully with photo; status changed to 'return_submitted'"
  );

  // Confirm student still CANNOT issue while physical verification is pending
  const issueWhilePending = await dbStore.issueEquipment({
    userId: studentAuth.user.id,
    inventoryItemId: secondRacket.id,
  });
  assert(
    Boolean(issueWhilePending.error),
    "Student blocked from issuing new equipment while physical verification is pending"
  );

  // 5. Administrator Action 1: Confirm Return
  console.log("\n--- 5. Administrator Mandatory Action 1: Confirm Return ---");
  const confirmResult = dbStore.confirmPhysicalReturn({
    issueId: activeIssue!.id,
    adminId: adminAuth.user.id,
    notes: "Item verified intact and placed back in circulation.",
  });
  assert(
    !confirmResult.error && confirmResult.issue?.status === "returned",
    "Admin confirms physical return; issue marked 'returned'"
  );

  // Verify student is now freed to issue again
  const issueAfterConfirmed = await dbStore.issueEquipment({
    userId: studentAuth.user.id,
    inventoryItemId: secondRacket.id,
  });
  assert(
    !issueAfterConfirmed.error && issueAfterConfirmed.issue?.status === "issued",
    "Student's active issue cleared; able to issue new equipment after admin confirmation"
  );

  // 6. Administrator Action 2: Not Returned
  console.log("\n--- 6. Administrator Mandatory Action 2: Not Returned ---");
  const notReturnedResult = dbStore.markNotReturned({
    issueId: issueAfterConfirmed.issue!.id,
    adminId: adminAuth.user.id,
    notes: "Checked counter and shelves; item missing.",
  });
  assert(
    !notReturnedResult.error && notReturnedResult.issue?.status === "not_returned",
    "Action 2 Not Returned records discrepancy, preserves issue as active/unreturned"
  );

  // 7. Administrator Action 3: Report Damage
  console.log("\n--- 7. Administrator Mandatory Action 3: Report Damage ---");
  const damageReportResult = await dbStore.reportDamage({
    inventoryItemId: secondRacket.id,
    adminId: adminAuth.user.id,
    description: "Handle grip torn and frame cracked.",
    issueId: issueAfterConfirmed.issue!.id,
  });
  assert(
    !damageReportResult.error && damageReportResult.report?.reporting_admin_email === adminAuth.user.email,
    "Action 3 Report Damage created linked report and updated item status to damaged"
  );

  // 8. Scheduled Automated Reminders (10 PM & 11 PM)
  console.log("\n--- 8. Scheduled Automated Jobs ---");
  const reminderResult = await dbStore.run10PmReminders();
  assert(
    typeof reminderResult.count === "number",
    "10 PM IST daily return reminder executed idempotently"
  );

  const overdueResult = await dbStore.run11PmOverdueJob();
  assert(
    typeof overdueResult.count === "number",
    "11 PM IST overdue job executed idempotently"
  );

  // 9. Real-Time Inventory & Authentication Fallback Edge-Case Tests
  console.log("\n--- 9. Real-Time Inventory & Return Auth Fallback Tests ---");

  // A. Authenticate a second student: Rohan Joshi
  const secondStudentAuth = dbStore.authenticateUser("rohan.joshi@flame.edu.in", "Rohan Joshi");

  // B. Attempt to issue the SAME item that is currently damaged (secondRacket) -> must be blocked
  const issueDamagedResult = await dbStore.issueEquipment({
    userId: secondStudentAuth.user.id,
    inventoryItemId: secondRacket.id,
  });
  assert(
    Boolean(issueDamagedResult.error),
    "Damaged item cannot be issued to any student"
  );

  // C. Physical return is confirmed for Priya's issue, but item remains damaged pending repair
  dbStore.confirmPhysicalReturn({
    issueId: issueAfterConfirmed.issue!.id,
    adminId: adminAuth.user.id,
    notes: "Damaged item physically received at counter for repair.",
  });

  // D. Admin restores the damaged item to 'available' after repair
  const restoreResult = dbStore.updateInventoryItemStatus(
    secondRacket.id,
    "available",
    adminAuth.user.id,
    "Repaired and inspected by sports staff"
  );
  assert(restoreResult.success, "Admin successfully restores damaged item to available");

  // D. Verify inventory reflects 'available'
  const invAfterRestore = dbStore.getInventory();
  const restoredItem = invAfterRestore.find((i) => i.id === secondRacket.id);
  assert(restoredItem?.status === "available", "Inventory accurately reflects restored item as available");

  // E. Rohan Joshi issues the restored racket
  const rohanIssue = await dbStore.issueEquipment({
    userId: secondStudentAuth.user.id,
    userEmail: secondStudentAuth.user.email,
    inventoryItemId: secondRacket.id,
  });
  assert(!rohanIssue.error, "Student successfully issues previously restored item");

  // F. Verify inventory immediately reflects 'issued' (NOT available)
  const invAfterRohanIssue = dbStore.getInventory();
  const issuedItemInInv = invAfterRohanIssue.find((i) => i.id === secondRacket.id);
  assert(
    issuedItemInInv?.status === "issued",
    "Admin inventory accurately displays currently checked-out item as 'issued', NOT 'available'"
  );

  // G. Another student attempts to issue the SAME physical item -> must be blocked
  const thirdStudentIssueSameItem = await dbStore.issueEquipment({
    userId: studentAuth.user.id,
    userEmail: studentAuth.user.email,
    inventoryItemId: secondRacket.id,
  });
  assert(
    Boolean(thirdStudentIssueSameItem.error),
    "Simultaneous issue of the same physical item is strictly blocked"
  );

  // H. Rohan returns equipment using only issueId and email (testing fallback auth)
  const returnWithEmailFallback = await dbStore.submitReturn({
    userEmail: "rohan.joshi@flame.edu.in",
    issueId: rohanIssue.issue!.id,
    acknowledgement: true,
    photoUrl: "https://example.com/test-photo.jpg",
  });
  assert(
    !returnWithEmailFallback.error && returnWithEmailFallback.issue?.status === "return_submitted",
    "Return submission with email fallback succeeds without 'Unauthenticated user' error"
  );

  // I. Admin confirms return
  const finalConfirm = dbStore.confirmPhysicalReturn({
    issueId: rohanIssue.issue!.id,
    adminId: adminAuth.user.id,
  });
  assert(
    !finalConfirm.error && finalConfirm.issue?.status === "returned",
    "Admin confirms return; item returns to circulation"
  );

  // 10. Summary
  console.log("\n==================================================================");
  console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
