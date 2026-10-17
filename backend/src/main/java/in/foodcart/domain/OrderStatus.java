package in.foodcart.domain;
/** PAYMENT_PENDING and EXPIRED orders are never shown to vendors. NO_SHOW: a pay-at-stall order nobody collected. */
public enum OrderStatus { PAYMENT_PENDING, PLACED, ACCEPTED, PREPARING, READY, COMPLETED, REJECTED, CANCELLED, EXPIRED, NO_SHOW }
