'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { request, type MenuCategory, type MenuItem, type PublicMenu, type Vendor } from '../lib/api';
import { CartBar } from './components/CartBar';
import { Cart, type OrderType } from './components/Cart';
import { CategoryMenu } from './components/CategoryMenu';
import { CategoryNav } from './components/CategoryNav';
import { ItemCustomizer } from './components/ItemCustomizer';
import { Menu } from './components/Menu';
import { useRouter } from 'next/navigation';
import { storedSession, storeSession } from '../lib/session';
import { saveVendor, syncSavedVendors } from '../lib/savedVendors';
import type { CustomerOrder, OrderView } from '../lib/orders';
import { TestCheckout } from './components/TestCheckout';
import { openCheckout, type CheckoutOutcome, type StartedPayment } from '../lib/payments';
import { StoreHeader, StoreSearch } from './components/StoreHeader';
import { VendorInfo } from './components/VendorInfo';
import {
  autoSelection,
  configurationFrom,
  customizationFor,
  needsCustomization,
  type StoredConfiguration,
} from './lib/customization';
import { linkItemsToCategories } from './lib/menuLinks';

export default function Store({ params }: { params: { slug: string } }) {
  const [vendor, setVendor] = useState<Vendor>();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [configs, setConfigs] = useState<Record<string, StoredConfiguration>>({});
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const [closingCustomizer, setClosingCustomizer] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<{ hoursSet: boolean; slots: string[] } | null>(null);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  /** Set once the customer submits a correct OTP; Pay uses it. */
  const [customerToken, setCustomerToken] = useState('');
  const [customerName, setCustomerName] = useState('');
  /** Dishes this customer ordered here before (newest first); empty when signed out or on a first visit. */
  const [orderAgainIds, setOrderAgainIds] = useState<string[]>([]);
  const [testCheckout, setTestCheckout] = useState<{ amount: number; resolve: (outcome: CheckoutOutcome) => void } | null>(null);
  const homeScroll = useRef(0);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [chromeHeight, setChromeHeight] = useState(130);
  const menuScroll = useRef(0);
  const restoreScroll = useRef(false);

  function captureScroll() {
    const scroller = document.querySelector('.storefront');
    if (!scroller) return;
    menuScroll.current = scroller.scrollTop;
  }

  useEffect(() => {
    let active = true;
    request<Vendor>('/api/public/vendors/' + params.slug).then(next => {
      if (active) setVendor(next);
    });
    request<PublicMenu>('/api/public/vendors/' + params.slug + '/menu').then(menu => {
      if (!active) return;
      const nextCategories = menu.categories ?? [];
      setCategories(nextCategories);
      setItems(menu.items ?? []);
      setCategoryId(current => current ?? nextCategories[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [params.slug]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!vendor) return;
    const scroller = document.querySelector('.storefront');
    if (!scroller) return;
    const keep = () => {
      if (!restoreScroll.current || scroller.scrollTop === menuScroll.current) return;
      scroller.scrollTop = menuScroll.current;
    };
    scroller.addEventListener('scroll', keep);
    return () => scroller.removeEventListener('scroll', keep);
  }, [vendor]);

  useLayoutEffect(() => {
    if (!restoreScroll.current) return;
    const scroller = document.querySelector('.storefront');
    if (scroller) scroller.scrollTop = menuScroll.current;
    if (customizingId) return;
    const timer = window.setTimeout(() => {
      if (scroller) scroller.scrollTop = menuScroll.current;
      restoreScroll.current = false;
    }, 80);
    return () => clearTimeout(timer);
  }, [customizingId]);

  useEffect(() => {
    if (open) return;
    const header = document.querySelector<HTMLElement>('.storefront .store-header-top');
    const search = document.querySelector<HTMLElement>('.storefront .store-search-dock');
    if (!header || !search) return;
    const update = () => {
      const next = header.offsetHeight + search.offsetHeight;
      if (next > 0) setChromeHeight(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    observer.observe(search);
    return () => observer.disconnect();
  }, [open, vendor]);

  const linked = useMemo(() => linkItemsToCategories(categories, items), [categories, items]);
  const customizing = linked.find(item => item.id === customizingId) ?? null;

  // The cart and the menu share one scroller: open the cart at its top, and return to the same spot in the menu.
  useLayoutEffect(() => {
    const scroller = document.querySelector('.storefront');
    if (scroller) scroller.scrollTop = open ? 0 : homeScroll.current;
  }, [open]);

  function openCart() {
    homeScroll.current = document.querySelector('.storefront')?.scrollTop ?? 0;
    setOpen(true);
  }

  // Opening a storefront (QR scan or link) saves the vendor for this customer's home page.
  useEffect(() => {
    saveVendor(params.slug, storedSession() || undefined);
  }, [params.slug]);

  // A returning customer is recognised without a new OTP; an expired or revoked session is forgotten.
  useEffect(() => {
    const token = storedSession();
    if (!token) return;
    request<{ mobile: string; name: string | null }>('/api/customers/me', {}, token)
      .then(profile => {
        setMobile(profile.mobile);
        setCustomerName(profile.name ?? '');
        setCustomerToken(token);
      })
      .catch(() => storeSession(''));
  }, []);

  function changeMobile(next: string) {
    setMobile(next);
    setCustomerToken('');
    setCustomerName('');
    storeSession('');
  }

  /** "Not you?": ends the session on the server too, so the old token stops working. */
  function signOut() {
    if (customerToken) request('/api/auth/logout', { method: 'POST' }, customerToken).catch(() => {});
    storeSession('');
    setCustomerToken('');
    setCustomerName('');
    setMobile('');
    setOtp('');
  }

  async function verifyOtp() {
    const session = await request<{ token: string }>('/api/auth/customer/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });
    // Returning customers already have a name and skip that step.
    const profile = await request<{ name: string | null }>('/api/customers/me', {}, session.token);
    setCustomerName(profile.name ?? '');
    setCustomerToken(session.token);
    storeSession(session.token);
    syncSavedVendors(session.token);
  }

  async function saveName(name: string) {
    const profile = await request<{ name: string | null }>('/api/customers/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }, customerToken);
    setCustomerName(profile.name ?? '');
  }

  useEffect(() => {
    if (!customerToken) {
      setOrderAgainIds([]);
      return;
    }
    let active = true;
    request<{ itemIds: string[] }>('/api/customers/me/vendors/' + params.slug + '/order-again', {}, customerToken)
      .then(result => active && setOrderAgainIds(result.itemIds ?? []))
      .catch(() => active && setOrderAgainIds([]));
    return () => {
      active = false;
    };
  }, [customerToken, params.slug]);

  // Slots move every half hour, so fetch them each time the cart opens.
  useEffect(() => {
    if (!open) return;
    loadSlots();
  }, [open, params.slug]);

  function loadSlots() {
    request<{ hoursSet: boolean; slots: string[] }>('/api/public/vendors/' + params.slug + '/slots')
      .then(setSlots)
      .catch(() => setSlots({ hoursSet: true, slots: [] }));
  }

  if (!vendor) return <main className="storefront"><p className="store-loading">Loading…</p></main>;
  const store = vendor;

  const chosen = linked.filter(item => cart[item.id]);
  const total = chosen.reduce((sum, item) => sum + (configs[item.id]?.unitPrice ?? item.price) * cart[item.id], 0);
  // Cheapest first across the whole menu (not grouped by category): easy add-ons at the front.
  const suggestions = linked
    .filter(item => item.available && !cart[item.id])
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? linked.filter(item => item.name.toLowerCase().includes(needle) || (item.description ?? '').toLowerCase().includes(needle))
    : linked;
  const shownCategories = categories.filter(category => shown.some(item => item.categoryId === category.id));
  const categoryCounts = shown.reduce<Record<string, number>>((counts, item) => {
    if (!item.categoryId) return counts;
    counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    return counts;
  }, {});

  function changeQuantity(item: MenuItem, next: number) {
    setCart(current => {
      const updated = { ...current };
      if (next < 1) delete updated[item.id];
      else updated[item.id] = next;
      return updated;
    });
    if (next < 1) {
      setConfigs(current => {
        const updated = { ...current };
        delete updated[item.id];
        return updated;
      });
    }
  }

  function addConfigured(item: MenuItem, configuration: StoredConfiguration) {
    setCart(current => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
    setConfigs(current => ({ ...current, [item.id]: configuration }));
    if (customizingId) closeCustomizer();
  }

  function openCustomizer(id: string) {
    captureScroll();
    restoreScroll.current = true;
    clearTimeout(closeTimer.current);
    setClosingCustomizer(false);
    setCustomizingId(id);
  }

  function addItem(item: MenuItem) {
    captureScroll();
    const spec = customizationFor(item);
    if (!needsCustomization(spec)) {
      addConfigured(item, configurationFrom(item, spec, autoSelection(spec)));
      return;
    }
    openCustomizer(item.id);
  }

  // Keeps the sheet mounted until the slide-down animation in globals.css finishes.
  function closeCustomizer() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCustomizingId(null);
      return;
    }
    setClosingCustomizer(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setCustomizingId(null);
      setClosingCustomizer(false);
    }, 320);
  }

  function selectCategory(id: string) {
    setCategoryId(id);
    document.getElementById('menu-category-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function sendOtp() {
    await request('/api/auth/customer/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  }

  async function waitForPayment(orderId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const current = (await request<OrderView>('/api/orders/' + orderId, {}, customerToken)).order;
      if (current.status === 'PLACED') return current;
      if (current.status !== 'PAYMENT_PENDING') throw new Error('This payment could not be used for the order. Any amount taken will be refunded.');
      await new Promise(done => setTimeout(done, 1000));
    }
    throw new Error('We are still confirming your payment. Check your orders in a minute before paying again.');
  }

  async function place(type: OrderType, slot: string) {
    setPaying(true);
    setPayError('');
    try {
      const created = await request<{ order: CustomerOrder; payment: StartedPayment }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: store.id,
          type,
          slot,
          displayedTotal: total,
          items:chosen.map(item => {
            const config = configs[item.id];
            return {
              menuItemId: item.id,
              quantity: cart[item.id],
              portion: config?.portion ?? 'FULL',
              sizeId: config?.sizeId,
              options: config?.options ?? [],
              displayedPrice: config?.unitPrice ?? item.price,
            };
          }),
        }),
      }, customerToken);
      const outcome = await openCheckout(created.payment, () => new Promise(resolve => setTestCheckout({ amount: created.order.total, resolve })));
      setTestCheckout(null);
      if (outcome === 'closed') throw new Error('Payment was not completed. Nothing was charged.');
      if (outcome === 'failure') throw new Error('Payment failed. Nothing was charged; please try again.');
      // The gateway's webhook confirms the payment on the server; wait for it rather than trusting the browser.
      const placed = await waitForPayment(created.order.id);
      router.push(`/${params.slug}/order/${placed.id}`);
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'Could not place the order.');
      // The chosen slot may have just expired; show the current ones.
      loadSlots();
    } finally {
      setTestCheckout(null);
      setPaying(false);
    }
  }


  const paymentSheet = testCheckout && (
    <TestCheckout amount={testCheckout.amount} onChoose={outcome => testCheckout.resolve(outcome)} />
  );

  const sheet = customizing && (
    <ItemCustomizer
      item={customizing}
      inset={chromeHeight}
      onClose={closeCustomizer}
      onAdd={configuration => addConfigured(customizing, configuration)}
    />
  );

  const underlay = customizing ? 'customizer-underlay' : undefined;

  return (
    <main className={'storefront' + (customizing ? ' customizing' : '') + (customizing && closingCustomizer ? ' closing' : '') + (open ? ' cart-open' : '')}>
      {open ? (
        <div className={underlay} aria-hidden={customizing ? true : undefined}>
          <Cart
            lines={chosen.map(item => ({
              item,
              quantity: cart[item.id],
              unitPrice: configs[item.id]?.unitPrice ?? item.price,
              summary: configs[item.id]?.summary,
            }))}
            suggestions={suggestions}
            quantities={cart}
            total={total}
            slots={slots?.slots ?? null}
            hoursSet={slots?.hoursSet ?? true}
            mobile={mobile}
            otp={otp}
            fallbackImage={store.coverImageUrl}
            onBack={() => setOpen(false)}
            onQuantity={changeQuantity}
            onAdd={addItem}
            onMobileChange={changeMobile}
            onOtpChange={setOtp}
            onSendOtp={sendOtp}
            onVerifyOtp={verifyOtp}
            verified={customerToken !== ''}
            customerName={customerName}
            onSaveName={saveName}
            onSignOut={signOut}
            onPay={place}
            paying={paying}
            payError={payError}
          />
        </div>
      ) : (
      <div className={underlay} aria-hidden={customizing ? true : undefined}>
      <StoreHeader>
        <VendorInfo vendor={store} />
      </StoreHeader>
      <StoreSearch query={query} onQueryChange={setQuery} />
      <div className="store-body">
        <Menu
          items={shown}
          orderAgain={orderAgainIds.map(id => items.find(item => item.id === id)).filter((item): item is MenuItem => item !== undefined)}
          categories={categories}
          quantities={cart}
          onAdd={addItem}
          onQuantity={changeQuantity}
          searching={needle.length > 0}
          fallbackImage={store.coverImageUrl}
          nav={<CategoryNav categories={shownCategories} selectedId={categoryId} onSelect={selectCategory} />}
        />
      </div>
      {!customizing && chosen.length > 0 && (
        <CartBar
          itemCount={chosen.reduce((sum, item) => sum + cart[item.id], 0)}
          total={total}
          onOpen={openCart}
        />
      )}
      {!customizing && (
        <CategoryMenu
          categories={shownCategories}
          counts={categoryCounts}
          selectedId={categoryId}
          raised={chosen.length > 0}
          onSelect={selectCategory}
        />
      )}
      </div>
      )}
      {sheet}
      {paymentSheet}
    </main>
  );
}
