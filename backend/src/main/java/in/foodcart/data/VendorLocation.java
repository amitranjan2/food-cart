package in.foodcart.data;

/** Where the stall is: the GPS point the vendor set at the stall plus the parts of the written address. */
public class VendorLocation {
  public Double lat;
  public Double lng;
  /** Shop / stall number. */
  public String shop;
  public String landmark;
  /** Street, area and city, usually filled from the map lookup and edited by the vendor. */
  public String area;
}
