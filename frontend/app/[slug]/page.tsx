'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { request, type MenuCategory, type MenuItem, type PublicMenu, type Vendor } from '../lib/api';
import { CartBar } from './components/CartBar';
import { Cart, type OrderType } from './components/Cart';
import { CategoryMenu } from './components/CategoryMenu';
import { CategoryNav } from './components/CategoryNav';
import { ItemCustomizer } from './components/ItemCustomizer';
import { Menu } from './components/Menu';
import { OrderConfirmation, type PlacedOrder } from './components/OrderConfirmation';
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
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [order, setOrder] = useState<PlacedOrder>();
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

  if (!vendor) return <main className="storefront"><p className="store-loading">Loading…</p></main>;
  const store = vendor;

  const chosen = linked.filter(item => cart[item.id]);
  const total = chosen.reduce((sum, item) => sum + (configs[item.id]?.unitPrice ?? item.price) * cart[item.id], 0);
  const suggestions = linked.filter(item => item.available && !cart[item.id]);
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

  async function place(type: OrderType) {
    setPaying(true);
    setPayError('');
    try {
      const session = await request<{ token: string }>('/api/auth/customer/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile, otp }),
      });
      const placed = await request<PlacedOrder>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: store.id,
          type,
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
      }, session.token);
      setOrder(placed);
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'Could not place the order.');
    } finally {
      setPaying(false);
    }
  }

  if (order) return <OrderConfirmation vendor={store} order={order} />;

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
            mobile={mobile}
            otp={otp}
            fallbackImage={store.coverImageUrl}
            onBack={() => setOpen(false)}
            onQuantity={changeQuantity}
            onAdd={addItem}
            onMobileChange={setMobile}
            onOtpChange={setOtp}
            onSendOtp={sendOtp}
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
          onOpen={() => setOpen(true)}
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
    </main>
  );
}
