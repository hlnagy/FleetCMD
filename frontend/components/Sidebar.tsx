"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Truck, Wrench, ShieldAlert, PackageCheck, CircleDot,
  Droplets, FileText, BarChart3, Settings, Clock, Link2, ChevronDown, ChevronRight,
  ShoppingCart, History, Building2, ShieldCheck, Layers, Users, Bell, X
} from 'lucide-react';
import { useSidebar } from '../lib/SidebarContext';
import { useAuth } from '../lib/AuthContext';
import OptiBaseFooter from '@/components/OptiBaseFooter';

interface SubNavItem {
  name: string;
  href: string;
  tabKey?: string;
  icon?: any;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: SubNavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const { isOpen, close } = useSidebar();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { name: 'Dashboard Principal', href: '/', icon: LayoutDashboard },
    {
      name: 'Vehicule & Flotă',
      href: '/fisa-tehnica',
      icon: Truck,
      subItems: [
        { name: 'Fișă Tehnică & Flotă', href: '/fisa-tehnica', icon: Truck },
        { name: 'Cuplare Ansambluri', href: '/ansambluri', icon: Link2 },
      ],
    },
    { name: 'Comenzi de Lucru', href: '/comenzi-lucru', icon: Wrench },
    { name: 'Profiluri Mentenanță', href: '/mentenanta', icon: Clock },
    {
      name: 'Facturi & Recepție Marfă',
      href: '/efactura',
      icon: FileText,
      subItems: [
        { name: '1. ANAF e-Factura (Import)', href: '/efactura?tab=efactura', tabKey: 'efactura', icon: FileText },
        { name: '2. Recepție Manuală Factură', href: '/efactura?tab=manual', tabKey: 'manual', icon: ShoppingCart },
        { name: '3. Istoric & Căutare Facturi', href: '/efactura?tab=istoric', tabKey: 'istoric', icon: History },
      ],
    },
    {
      name: 'Gestiune Stoc & Garanții',
      href: '/stocuri',
      icon: PackageCheck,
      subItems: [
        { name: '1. Gestiune Piese & Consumabile', href: '/stocuri?tab=stoc', tabKey: 'stoc', icon: PackageCheck },
        { name: '2. Magazie Centrală Anvelope (Serii)', href: '/stocuri?tab=anvelope_stoc', tabKey: 'anvelope_stoc', icon: CircleDot },
        { name: '3. Depozite Flotă & Transferuri', href: '/stocuri?tab=depozite', tabKey: 'depozite', icon: Building2 },
        { name: '4. Garanții Componente Serializate', href: '/stocuri?tab=componente', tabKey: 'componente', icon: ShieldCheck },
      ],
    },
    { name: 'Anvelope & Axe', href: '/anvelope', icon: CircleDot },
    { name: 'Gestiune Uleiuri & Fluide', href: '/fluide', icon: Droplets },
    { name: 'Alerte Active', href: '/alerte', icon: ShieldAlert },
    { name: 'Rapoarte & Analitică', href: '/rapoarte', icon: BarChart3 },
  ];

  const setariItem: NavItem = {
    name: 'Setări Sistem',
    href: '/setari',
    icon: Settings,
  };

  // Stare pentru deschiderea/închiderea accordion-urilor
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    '/stocuri': false,
    '/fisa-tehnica': false,
    '/efactura': false,
  });

  // Deschidem automat secțiunea activă la schimbarea rutei și închidem meniul pe mobil
  useEffect(() => {
    close();
    if (pathname.startsWith('/stocuri')) {
      setOpenSections((prev) => ({ ...prev, '/stocuri': true }));
    } else if (pathname.startsWith('/fisa-tehnica') || pathname.startsWith('/ansambluri')) {
      setOpenSections((prev) => ({ ...prev, '/fisa-tehnica': true }));
    } else if (pathname.startsWith('/efactura')) {
      setOpenSections((prev) => ({ ...prev, '/efactura': true }));
    }
  }, [pathname]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const hasSubItems = !!(item.subItems && item.subItems.length > 0);
    const isSectionActive =
      pathname === item.href ||
      (hasSubItems && pathname !== '/' && item.subItems?.some((s) => pathname === s.href.split('?')[0] || pathname.startsWith(s.href.split('?')[0] + '/')));
    const isOpen = !!openSections[item.href];

    if (hasSubItems) {
      return (
        <div key={item.name} className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection(item.href)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all select-none ${
              isSectionActive
                ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
                : 'text-slate-700 hover:bg-morning-100 hover:text-sapphire-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Icon className={`w-4 h-4 ${isSectionActive ? 'text-white' : 'text-sage-500'}`} />
              <span>{item.name}</span>
            </div>
            {isOpen ? (
              <ChevronDown className={`w-4 h-4 transition-transform ${isSectionActive ? 'text-white' : 'text-sage-400'}`} />
            ) : (
              <ChevronRight className={`w-4 h-4 transition-transform ${isSectionActive ? 'text-white' : 'text-sage-400'}`} />
            )}
          </button>

          {/* Sub-Meniu Expandabil */}
          {isOpen && (
            <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-sapphire-200 ml-4 animate-fade-in">
              {item.subItems.map((sub) => {
                const SubIcon = sub.icon || CornerDownRightIcon;
                let isSubActive = false;

                if (sub.tabKey) {
                  isSubActive =
                    pathname === item.href &&
                    (currentTab === sub.tabKey ||
                      (!currentTab && sub.tabKey === 'stoc') ||
                      (!currentTab && sub.tabKey === 'efactura') ||
                      (!currentTab && sub.tabKey === 'vehicule'));
                } else {
                  isSubActive = pathname === sub.href;
                }

                return (
                  <Link
                    key={sub.name}
                    href={sub.href}
                    onClick={close}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                      isSubActive
                        ? 'bg-sapphire-100 text-sapphire-900 border border-sapphire-300 font-extrabold shadow-2xs'
                        : 'text-slate-600 hover:bg-morning-100 hover:text-sapphire-900'
                    }`}
                  >
                    <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-sapphire-600' : 'text-sage-400'}`} />
                    <span className="truncate">{sub.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const isActive = pathname === item.href;
    return (
      <div key={item.name}>
        <Link
          href={item.href}
          onClick={close}
          className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            isActive
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-slate-600 hover:bg-morning-100 hover:text-sapphire-900'
          }`}
        >
          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sage-500'}`} />
          <span>{item.name}</span>
        </Link>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop pentru Mobile */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-label="Închide meniul lateral"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-morning-200 flex flex-col h-screen transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:z-40 shadow-2xl lg:shadow-none shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Antet Brand */}
        <div className="p-5 border-b border-morning-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sapphire-500 flex items-center justify-center shadow-md shadow-sapphire-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-sapphire-900 tracking-tight flex items-center">
                Fleet<span className="text-sapphire-500">CMD</span>
              </h1>
              <p className="text-[10px] text-sage-700 font-semibold uppercase tracking-wider">CMMS & FMS Enterprise RO</p>
            </div>
          </div>

          {/* Buton Închidere Drawer Mobil */}
          <button
            type="button"
            onClick={close}
            className="lg:hidden p-1.5 rounded-xl text-sage-500 hover:text-sapphire-900 hover:bg-morning-100 transition"
            title="Închide Meniul"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigație Principală */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => !(user?.rol === 'VIEWER' && item.href === '/efactura'))
            .map(renderNavItem)}
        </nav>

        {/* Subsol & Setări */}
        <div className="p-3 border-t border-morning-200 space-y-2">
          {renderNavItem(setariItem)}
          <OptiBaseFooter variant="sidebar" />
        </div>
      </aside>
    </>
  );
}

function CornerDownRightIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <polyline points="15 10 20 15 15 20" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </svg>
  );
}
