package in.foodcart.domain;

/**
 * Where a stall is in onboarding (tracker S4.19). Only APPROVED stalls are visible to customers.
 * DRAFT: signed up, setting up · SUBMITTED: waiting for the team · CHANGES_NEEDED: the team sent it back with a note.
 * Stalls created by the team (ops/create-vendor.sh) and every stall from before onboarding existed are APPROVED.
 */
public enum VendorReview { DRAFT, SUBMITTED, CHANGES_NEEDED, APPROVED }
