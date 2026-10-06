'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { request, type MenuCategory, type MenuItem, type PublicMenu, type Vendor } from '../lib/api';
import { CartBar } from './components/CartBar';
import { Cart } from './components/Cart';
import { CategoryMenu } from './components/CategoryMenu';
import { CategoryNav } from './components/CategoryNav';
import { ItemCustomizer } from './components/ItemCustomizer';
import { Menu } from './components/Menu';
import { OrderConfirmation, type PlacedOrder } from './components/OrderConfirmation';
import { StoreHeader } from './components/StoreHeader';
import { VendorInfo } from './components/VendorInfo';
import { type StoredConfiguration } from './lib/customization';
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
    closeCustomizer();
  }

  function openCustomizer(id: string) {
    clearTimeout(closeTimer.current);
    setClosingCustomizer(false);
    setCustomizingId(id);
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

  // Checkout stays unwired until OTP and payment exist.
  async function place() {
    const session = await request<{ token: string }>('/api/auth/customer/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });
    const placed = await request<PlacedOrder>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        vendorId: store.id,
        type: 'PICKUP',
        items: chosen.map(item => {
          // Orders only accept catalog HALF/FULL prices. Add-on and Large
          // amounts stay on the cart until the order API grows modifiers.
          const half = configs[item.id]?.sizeId === 'half' && item.halfPrice != null && item.halfAvailable !== false;
          return {
            menuItemId: item.id,
            quantity: cart[item.id],
            portion: half ? 'HALF' : 'FULL',
            displayedPrice: half ? item.halfPrice : item.price,
          };
        }),
      }),
    }, session.token);
    setOrder(placed);
  }

  if (order) return <OrderConfirmation vendor={store} order={order} />;

  const cartOpen = open && !customizing;

  return (
    <main className={'storefront' + (customizing ? ' customizing' : '') + (customizing && closingCustomizer ? ' closing' : '') + (cartOpen ? ' cart-open' : '')}>
      {open && (
        <div className={customizing ? 'cart-parked' : undefined}>
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
            onAdd={item => openCustomizer(item.id)}
            onMobileChange={setMobile}
            onOtpChange={setOtp}
          />
        </div>
      )}
      {(!open || customizing) && (
      <>
      <StoreHeader
        query={query}
        onQueryChange={setQuery}
        onClose={customizing ? closeCustomizer : undefined}
      >
        <VendorInfo vendor={store} />
      </StoreHeader>
      <div className="store-body">
        {customizing && (
          <button type="button" className="customizer-close" onClick={closeCustomizer} aria-label="Close customization">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3 3 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div className={customizing ? 'menu-underlay' : undefined} aria-hidden={customizing ? true : undefined}>
          <Menu
            items={shown}
            categories={categories}
            quantities={cart}
            onAdd={item => openCustomizer(item.id)}
            onQuantity={changeQuantity}
            searching={needle.length > 0}
            fallbackImage={store.coverImageUrl}
            nav={<CategoryNav categories={shownCategories} selectedId={categoryId} onSelect={selectCategory} />}
          />
        </div>
        {customizing && (
          <ItemCustomizer
            item={customizing}
            fallbackImage={store.coverImageUrl}
            onClose={closeCustomizer}
            onAdd={configuration => addConfigured(customizing, configuration)}
          />
        )}
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
      </>
      )}
    </main>
  );
}
