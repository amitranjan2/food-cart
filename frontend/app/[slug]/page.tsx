'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { request, type MenuCategory, type MenuItem, type PublicMenu, type Vendor } from '../lib/api';
import { CartBar } from './components/CartBar';
import { Cart } from './components/Cart';
import { CategoryMenu } from './components/CategoryMenu';
import { CategoryNav } from './components/CategoryNav';
import { ItemCustomizer } from './components/ItemCustomizer';
import { Menu } from './components/Menu';
import { OrderConfirmation, type PlacedOrder } from './components/OrderConfirmation';
import { StoreHeader, StoreSearch } from './components/StoreHeader';
import { VendorInfo } from './components/VendorInfo';
import { defaultConfiguration, requiresCustomization, type StoredConfiguration } from './lib/customization';
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
  const headerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuScrollY = useRef(0);
  const restoreScrollAfterAdd = useRef(false);

  function rememberMenuScroll() {
    menuScrollY.current = window.scrollY;
  }

  function applyMenuScroll() {
    window.scrollTo(0, menuScrollY.current);
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
    if (open) return;
    const header = headerRef.current;
    const search = searchRef.current;
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
  const customizingItem = linked.find(item => item.id === customizingId) ?? null;
  const showCustomizer = customizingItem != null && requiresCustomization(customizingItem);

  useEffect(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!showCustomizer) return;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = '';
      applyMenuScroll();
      requestAnimationFrame(() => applyMenuScroll());
    };
  }, [showCustomizer]);

  useLayoutEffect(() => {
    if (showCustomizer || !restoreScrollAfterAdd.current) return;
    restoreScrollAfterAdd.current = false;
    applyMenuScroll();
    requestAnimationFrame(() => applyMenuScroll());
  }, [cart, showCustomizer]);

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
    const item = linked.find(entry => entry.id === id);
    if (item && !requiresCustomization(item)) {
      clearTimeout(closeTimer.current);
      setClosingCustomizer(false);
      setCustomizingId(null);
      addConfigured(item, defaultConfiguration(item));
      return;
    }
    clearTimeout(closeTimer.current);
    setClosingCustomizer(false);
    rememberMenuScroll();
    setCustomizingId(id);
  }

  function addItem(item: MenuItem) {
    if (!item.available) return;
    rememberMenuScroll();
    if (!requiresCustomization(item)) {
      clearTimeout(closeTimer.current);
      setClosingCustomizer(false);
      setCustomizingId(null);
      restoreScrollAfterAdd.current = true;
      addConfigured(item, defaultConfiguration(item));
      return;
    }
    openCustomizer(item.id);
  }

  // Keeps the sheet mounted until the slide-down animation in globals.css finishes.
  function closeCustomizer() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCustomizingId(null);
      setClosingCustomizer(false);
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

  async function place() {
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
          type: 'PICKUP',
          items: chosen.map(item => {
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

  const sheet = showCustomizer && customizingItem && (
    <ItemCustomizer
      item={customizingItem}
      inset={chromeHeight}
      onClose={closeCustomizer}
      onAdd={configuration => addConfigured(customizingItem, configuration)}
    />
  );

  const underlay = showCustomizer ? 'customizer-underlay' : undefined;

  return (
    <main className={'storefront' + (showCustomizer ? ' customizing' : '') + (showCustomizer && closingCustomizer ? ' closing' : '') + (open ? ' cart-open' : '')}>
      {open ? (
        <div className={underlay} aria-hidden={showCustomizer ? true : undefined}>
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
            onPay={place}
            paying={paying}
            payError={payError}
          />
        </div>
      ) : (
      <div className={underlay} aria-hidden={showCustomizer ? true : undefined}>
      <div ref={headerRef}>
        <StoreHeader>
          <VendorInfo vendor={store} />
        </StoreHeader>
      </div>
      <StoreSearch headerRef={headerRef} measureRef={searchRef} query={query} onQueryChange={setQuery} />
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
      {!open && !showCustomizer && chosen.length > 0 && (
        <CartBar
          itemCount={chosen.reduce((sum, item) => sum + cart[item.id], 0)}
          total={total}
          onOpen={() => setOpen(true)}
        />
      )}
      {!showCustomizer && (
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
