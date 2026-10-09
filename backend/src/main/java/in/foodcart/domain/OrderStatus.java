package in.foodcart.domain;
/** PAYMENT_PENDING and EXPIRED orders are never shown to vendors. */
public enum OrderStatus { PAYMENT_PENDING, PLACED, ACCEPTED, PREPARING, READY, COMPLETED, REJECTED, CANCELLED, EXPIRED }
