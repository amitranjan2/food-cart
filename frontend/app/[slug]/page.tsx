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
import { addLine, lastLineOf, linesOf, quantitiesByItem, setLineQuantity, type CartEntry } from './lib/cartLines';
import { RepeatPrompt } from './components/RepeatPrompt';
import { PolicyFooter } from '../components/LegalPage';
import { themeStyle } from '../lib/theme';

/** Most dishes shown in the cart's "You may also like" row. */
const SUGGESTION_LIMIT = 12;

export default function Store({ params }: { params: { slug: string } }) {
  const [vendor, setVendor] = useState<Vendor>();
  const [missing, setMissing] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [lines, setLines] = useState<CartEntry[]>([]);
  /** Dish whose "Repeat last / Choose again" prompt is open. */
  const [repeatId, setRepeatId] = useState<string | null>(null);
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const [closingCustomizer, setClosingCustomizer] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<{ open?: boolean; hoursSet: boolean; slots: string[] } | null>(null);
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
    setMissing(false);
    request<Vendor>('/api/public/vendors/' + params.slug)
      .then(next => {
        if (active) setVendor(next);
      })
      .catch(() => active && setMissing(true));
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
    request<{ open?: boolean; hoursSet: boolean; slots: string[] }>('/api/public/vendors/' + params.slug + '/slots')
      .then(setSlots)
      .catch(() => setSlots({ hoursSet: true, slots: [] }));
  }

  if (missing) {
    return (
      <main className="storefront store-missing">
        <h1>No store at this link</h1>
        <p>Check the link, or scan the QR code at the stall again.</p>
        <a href="/">Go to your stalls</a>
      </main>
    );
  }
  if (!vendor) return <main className="storefront"><p className="store-loading">Loading…</p></main>;
  const store = vendor;

  const cart = quantitiesByItem(lines);
  const chosen = lines.flatMap(line => {
    const item = linked.find(entry => entry.id === line.itemId);
    return item ? [{ line, item }] : [];
  });
  const total = chosen.reduce((sum, { line }) => sum + line.config.unitPrice * line.quantity, 0);
  // Cheapest first across the whole menu (not grouped by category): easy add-ons at the front. Capped so it stays a nudge.
  const suggestions = linked
    .filter(item => item.available && !cart[item.id])
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
    .slice(0, SUGGESTION_LIMIT);
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

  /** + / − on a menu card, which shows the dish's total across its cart lines. */
  function changeQuantity(item: MenuItem, next: number) {
    const own = linesOf(lines, item.id);
    const current = own.reduce((sum, line) => sum + line.quantity, 0);
    if (next > current) {
      if (own.length === 0) addItem(item);
      // A dish with choices asks whether to repeat the last one or pick again (a new line).
      else if (needsCustomization(customizationFor(item))) setRepeatId(item.id);
      else setLines(all => setLineQuantity(all, own[0].key, own[0].quantity + 1));
      return;
    }
    if (own.length === 1) setLines(all => setLineQuantity(all, own[0].key, next));
    // Several versions in the cart: the card can't tell which one to remove, so show them in the cart.
    else if (own.length > 1) openCart();
  }

  function addConfigured(item: MenuItem, configuration: StoredConfiguration) {
    setLines(all => addLine(all, item.id, configuration));
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
          items: chosen.map(({ line, item }) => ({
            menuItemId: item.id,
            quantity: line.quantity,
            portion: line.config.portion,
            sizeId: line.config.sizeId,
            options: line.config.options,
            displayedPrice: line.config.unitPrice,
          })),
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


  const repeatItem = repeatId ? linked.find(item => item.id === repeatId) : undefined;
  const repeatLast = repeatId ? lastLineOf(lines, repeatId) : undefined;
  const repeatSheet = repeatItem && repeatLast && (
    <RepeatPrompt
      item={repeatItem}
      last={repeatLast.config}
      onRepeat={() => {
        setLines(all => setLineQuantity(all, repeatLast.key, repeatLast.quantity + 1));
        setRepeatId(null);
      }}
      onChooseAgain={() => {
        setRepeatId(null);
        openCustomizer(repeatItem.id);
      }}
      onClose={() => setRepeatId(null)}
    />
  );

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
    <main className={'storefront' + (customizing ? ' customizing' : '') + (customizing && closingCustomizer ? ' closing' : '') + (open ? ' cart-open' : '')} style={themeStyle(store)}>
      {open ? (
        <div className={underlay} aria-hidden={customizing ? true : undefined}>
          <Cart
            lines={chosen.map(({ line, item }) => ({
              key: line.key,
              item,
              quantity: line.quantity,
              unitPrice: line.config.unitPrice,
              summary: line.config.summary,
            }))}
            suggestions={suggestions}
            quantities={cart}
            total={total}
            slots={slots?.slots ?? null}
            hoursSet={slots?.hoursSet ?? true}
            storeOpen={slots?.open ?? store.status === 'OPEN'}
            mobile={mobile}
            otp={otp}
            fallbackImage={store.coverImageUrl}
            onBack={() => setOpen(false)}
            onQuantity={changeQuantity}
            onLineQuantity={(key, next) => setLines(all => setLineQuantity(all, key, next))}
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
        {store.status === 'CLOSED' ? (
          <p className="store-closed" role="status">
            <strong>Not taking orders right now.</strong> You can still look at the menu; check back when the stall opens.
          </p>
        ) : null}
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
        <PolicyFooter />
      </div>
      {!customizing && chosen.length > 0 && (
        <CartBar
          itemCount={chosen.reduce((sum, { line }) => sum + line.quantity, 0)}
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
      {repeatSheet}
      {paymentSheet}
    </main>
  );
}
