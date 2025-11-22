"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Home, Package, ShoppingCart, FileText, TrendingUp, 
  Settings as SettingsIcon, Moon, Sun, Search, Plus, Minus, Trash2, Edit, 
  Download, QrCode, AlertTriangle, CheckCircle, Clock, DollarSign,
  BarChart3, PieChart as PieChartIcon, ChevronRight, Filter,
  Printer, RefreshCw, Archive, Tag, Wrench, Gauge, LogIn, LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Tipos de datos
interface Product {
  id: string;
  name: string;
  category: string;
  code: string;
  qrCode: string;
  stock: number;
  minStock: number;
  buyPrice: number;
  sellPrice: number;
  brand: string;
  location: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  status: string;
}

interface Order {
  id: string;
  products: { productId: string; quantity: number; productName: string }[];
  date: string;
  status: string;
  supplier: string;
  supplierId?: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  products: string[];
  address: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'seller';
  avatar: string;
}

// Tipo del Contexto
interface AppContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  products: Product[];
  setProducts: (products: Product[]) => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  completeSale: (paymentMethod: string) => void;
  sales: Sale[];
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  currentUser: User;
  exportToPDF: (type: string) => void;
  isAuthenticated: boolean;
  handleLogout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};

// Componente Principal
export default function AutoPartsManager() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState<User>({
    id: '1',
    name: 'Usuario',
    email: 'admin@autoparts.com',
    role: 'developer',
    avatar: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f2ae1bfd-766f-49b5-a1ba-c140af0c845a.png'
  });

  // Verificar autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setCurrentUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Usuario',
          email: firebaseUser.email || '',
          role: 'developer',
          avatar: firebaseUser.photoURL || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/24a89fef-20a7-4a51-b80c-b88a1e60d2e8.png'
        });
      } else {
        setIsAuthenticated(false);
        setShowLoginModal(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setLoginError('');
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error) {
      setLoginError('Email o contraseña incorrectos');
      console.error('Error al iniciar sesión:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCart([]);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Funciones para generar datos de ejemplo
  const generateSampleSuppliers = (): Supplier[] => [
    {
      id: 'SUP001',
      name: 'Distribuidora Central',
      phone: '+54 11 6959-5853',
      email: 'ventas@distribuidoracentral.com',
      products: ['Batería 12V 75Ah', 'Amortiguador Delantero', 'Radiador Aluminio'],
      address: 'Av. Industrial 1234, Buenos Aires'
    },
    {
      id: 'SUP002',
      name: 'Importadora AutoParts',
      phone: '+54 11 6959-5853',
      email: 'contacto@autopartsimport.com',
      products: ['Filtros Bosch', 'Pastillas Brembo', 'Aceites Mobil'],
      address: 'Calle Comercio 567, CABA'
    },
    {
      id: 'SUP003',
      name: 'Repuestos del Norte',
      phone: '+54 11 6959-5853',
      email: 'info@repuestosnorte.com',
      products: ['Bujías NGK', 'Cables de Encendido', 'Kit de Embrague'],
      address: 'Ruta 9 Km 45, San Miguel'
    }
  ];

  const generateSampleProducts = (): Product[] => [
    {
      id: '1',
      name: 'Filtro de Aceite Premium',
      category: 'Filtros',
      code: 'FLT-001',
      qrCode: 'QR-FLT-001',
      stock: 45,
      minStock: 20,
      buyPrice: 1200,
      sellPrice: 2500,
      brand: 'Bosch',
      location: 'Estante A1'
    },
    {
      id: '2',
      name: 'Pastillas de Freno Delanteras',
      category: 'Frenos',
      code: 'BRK-002',
      qrCode: 'QR-BRK-002',
      stock: 15,
      minStock: 10,
      buyPrice: 3500,
      sellPrice: 7800,
      brand: 'Brembo',
      location: 'Estante B2'
    },
    {
      id: '3',
      name: 'Batería 12V 75Ah',
      category: 'Electricidad',
      code: 'BAT-003',
      qrCode: 'QR-BAT-003',
      stock: 8,
      minStock: 5,
      buyPrice: 15000,
      sellPrice: 28000,
      brand: 'Moura',
      location: 'Depósito'
    },
    {
      id: '4',
      name: 'Aceite Sintético 5W30',
      category: 'Lubricantes',
      code: 'OIL-004',
      qrCode: 'QR-OIL-004',
      stock: 60,
      minStock: 30,
      buyPrice: 2800,
      sellPrice: 5500,
      brand: 'Mobil',
      location: 'Estante C3'
    },
    {
      id: '5',
      name: 'Bujías Platino Set x4',
      category: 'Encendido',
      code: 'SPK-005',
      qrCode: 'QR-SPK-005',
      stock: 25,
      minStock: 15,
      buyPrice: 1800,
      sellPrice: 4200,
      brand: 'NGK',
      location: 'Estante A2'
    },
    {
      id: '6',
      name: 'Correa de Distribución',
      category: 'Motor',
      code: 'BLT-006',
      qrCode: 'QR-BLT-006',
      stock: 12,
      minStock: 8,
      buyPrice: 4500,
      sellPrice: 9800,
      brand: 'Gates',
      location: 'Estante D1'
    },
    {
      id: '7',
      name: 'Filtro de Aire',
      category: 'Filtros',
      code: 'FLT-007',
      qrCode: 'QR-FLT-007',
      stock: 38,
      minStock: 25,
      buyPrice: 800,
      sellPrice: 1800,
      brand: 'Mann',
      location: 'Estante A1'
    },
    {
      id: '8',
      name: 'Amortiguador Delantero',
      category: 'Suspensión',
      code: 'SUS-008',
      qrCode: 'QR-SUS-008',
      stock: 6,
      minStock: 4,
      buyPrice: 8500,
      sellPrice: 16500,
      brand: 'Monroe',
      location: 'Estante E1'
    },
    {
      id: '9',
      name: 'Kit de Embrague',
      category: 'Transmisión',
      code: 'CLU-009',
      qrCode: 'QR-CLU-009',
      stock: 5,
      minStock: 3,
      buyPrice: 12000,
      sellPrice: 24500,
      brand: 'Valeo',
      location: 'Depósito'
    },
    {
      id: '10',
      name: 'Radiador Aluminio',
      category: 'Refrigeración',
      code: 'RAD-010',
      qrCode: 'QR-RAD-010',
      stock: 4,
      minStock: 2,
      buyPrice: 18000,
      sellPrice: 35000,
      brand: 'Denso',
      location: 'Depósito'
    },
    {
      id: '11',
      name: 'Bomba de Agua',
      category: 'Refrigeración',
      code: 'PMP-011',
      qrCode: 'QR-PMP-011',
      stock: 18,
      minStock: 10,
      buyPrice: 3200,
      sellPrice: 6800,
      brand: 'Dolz',
      location: 'Estante F2'
    },
    {
      id: '12',
      name: 'Juego de Cables de Bujía',
      category: 'Encendido',
      code: 'CBL-012',
      qrCode: 'QR-CBL-012',
      stock: 22,
      minStock: 12,
      buyPrice: 1500,
      sellPrice: 3400,
      brand: 'NGK',
      location: 'Estante A2'
    }
  ];

  const generateSampleSales = (): Sale[] => {
    const sampleProducts = [
      {
        id: '1',
        name: 'Filtro de Aceite Premium',
        category: 'Filtros',
        code: 'FLT-001',
        qrCode: 'QR-FLT-001',
        stock: 45,
        minStock: 20,
        buyPrice: 1200,
        sellPrice: 2500,
        brand: 'Bosch',
        location: 'Estante A1'
      },
      {
        id: '2',
        name: 'Pastillas de Freno Delanteras',
        category: 'Frenos',
        code: 'BRK-002',
        qrCode: 'QR-BRK-002',
        stock: 15,
        minStock: 10,
        buyPrice: 3500,
        sellPrice: 7800,
        brand: 'Brembo',
        location: 'Estante B2'
      },
      {
        id: '4',
        name: 'Aceite Sintético 5W30',
        category: 'Lubricantes',
        code: 'OIL-004',
        qrCode: 'QR-OIL-004',
        stock: 60,
        minStock: 30,
        buyPrice: 2800,
        sellPrice: 5500,
        brand: 'Mobil',
        location: 'Estante C3'
      },
      {
        id: '5',
        name: 'Bujías Platino Set x4',
        category: 'Encendido',
        code: 'SPK-005',
        qrCode: 'QR-SPK-005',
        stock: 25,
        minStock: 15,
        buyPrice: 1800,
        sellPrice: 4200,
        brand: 'NGK',
        location: 'Estante A2'
      },
      {
        id: '11',
        name: 'Bomba de Agua',
        category: 'Refrigeración',
        code: 'PMP-011',
        qrCode: 'QR-PMP-011',
        stock: 18,
        minStock: 10,
        buyPrice: 3200,
        sellPrice: 6800,
        brand: 'Dolz',
        location: 'Estante F2'
      }
    ];
    
    return [
      {
        id: 'V001',
        date: '2025-01-15',
        items: [
          { ...sampleProducts[0], quantity: 2 },
          { ...sampleProducts[2], quantity: 1 }
        ],
        total: 10500,
        paymentMethod: 'Efectivo',
        status: 'Completado'
      },
      {
        id: 'V002',
        date: '2025-01-14',
        items: [
          { ...sampleProducts[1], quantity: 1 },
          { ...sampleProducts[3], quantity: 2 }
        ],
        total: 16200,
        paymentMethod: 'Transferencia',
        status: 'Completado'
      },
      {
        id: 'V003',
        date: '2025-01-13',
        items: [
          { ...sampleProducts[4], quantity: 1 }
        ],
        total: 6800,
        paymentMethod: 'QR',
        status: 'Completado'
      },
      {
        id: 'V004',
        date: '2025-01-12',
        items: [
          { ...sampleProducts[0], quantity: 3 },
          { ...sampleProducts[2], quantity: 2 },
          { ...sampleProducts[3], quantity: 1 }
        ],
        total: 22900,
        paymentMethod: 'Débito',
        status: 'Completado'
      }
    ];
  };

  // Cargar datos desde localStorage
  useEffect(() => {
    const savedProducts = localStorage.getItem('autoparts_products');
    const savedSales = localStorage.getItem('autoparts_sales');
    const savedOrders = localStorage.getItem('autoparts_orders');
    const savedDarkMode = localStorage.getItem('autoparts_darkmode');

    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      setProducts(generateSampleProducts());
    }
    
    if (savedSales) {
      setSales(JSON.parse(savedSales));
    } else {
      setSales(generateSampleSales());
    }
    
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    } else {
      setOrders([
        {
          id: 'ORD001',
          products: [
            { productId: '3', quantity: 10, productName: 'Batería 12V 75Ah' },
            { productId: '8', quantity: 8, productName: 'Amortiguador Delantero' }
          ],
          date: '2025-01-16',
          status: 'Pendiente',
          supplier: 'Distribuidora Central',
          supplierId: 'SUP001'
        },
        {
          id: 'ORD002',
          products: [
            { productId: '10', quantity: 4, productName: 'Radiador Aluminio' }
          ],
          date: '2025-01-14',
          status: 'Completado',
          supplier: 'Importadora AutoParts',
          supplierId: 'SUP002'
        }
      ]);
    }
    
    const savedSuppliers = localStorage.getItem('autoparts_suppliers');
    if (savedSuppliers) {
      setSuppliers(JSON.parse(savedSuppliers));
    } else {
      setSuppliers(generateSampleSuppliers());
    }
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar datos en localStorage
  useEffect(() => {
    localStorage.setItem('autoparts_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('autoparts_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('autoparts_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('autoparts_darkmode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('autoparts_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const completeSale = (paymentMethod: string) => {
    const total = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
    const newSale: Sale = {
      id: `V${String(sales.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      total,
      paymentMethod,
      status: 'Completado'
    };
    
    const updatedProducts = products.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        return { ...product, stock: product.stock - cartItem.quantity };
      }
      return product;
    });
    
    setSales([...sales, newSale]);
    setProducts(updatedProducts);
    setCart([]);
    checkAndGenerateOrders(updatedProducts);
  };

  const checkAndGenerateOrders = (currentProducts: Product[]) => {
    const lowStockProducts = currentProducts.filter(p => p.stock <= p.minStock);
    if (lowStockProducts.length > 0) {
      const newOrder: Order = {
        id: `ORD${String(orders.length + 1).padStart(3, '0')}`,
        products: lowStockProducts.map(p => ({
          productId: p.id,
          quantity: p.minStock * 2,
          productName: p.name
        })),
        date: new Date().toISOString().split('T')[0],
        status: 'Pendiente',
        supplier: 'Proveedor Principal'
      };
      setOrders([...orders, newOrder]);
    }
  };

  const exportToPDF = (type: string) => {
    alert(`Exportando ${type} a PDF...\nEsta es una simulación. En producción se usaría jsPDF.`);
  };

  const contextValue = {
    darkMode,
    setDarkMode,
    currentView,
    setCurrentView,
    sidebarOpen,
    setSidebarOpen,
    products,
    setProducts,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    completeSale,
    sales,
    orders,
    setOrders,
    suppliers,
    setSuppliers,
    currentUser,
    exportToPDF,
    isAuthenticated,
    handleLogout
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
          {isAuthenticated ? (
            <>
              <Navbar />
              <div className="flex">
                <Sidebar />
                <MainContent />
              </div>
            </>
          ) : null}

          {showLoginModal && (
            <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center z-50 p-4 sm:p-6">
              <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-2xl">
                      <Wrench className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">AutoParts Manager</CardTitle>
                  <CardDescription>Inicia sesión para continuar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loginError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="admin@autoparts.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    onClick={handleLogin}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Iniciar Sesión
                  </Button>
                  <div className="text-center text-sm text-slate-500 mt-4">
                    <p>Credenciales de prueba:</p>
                    <p className="font-mono text-xs mt-1">admin@autoparts.com / admin123</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}

// Componente Navbar
function Navbar() {
  const { darkMode, setDarkMode, sidebarOpen, setSidebarOpen, handleLogout } = useApp();

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-md">
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  AutoParts Manager
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Sistema de Gestión de Repuestos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-full"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-red-600 hover:bg-red-50"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Componente Sidebar
function Sidebar() {
  const { sidebarOpen, currentView, setCurrentView, setSidebarOpen } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart },
    { id: 'orders', label: 'Pedidos', icon: FileText },
    { id: 'suppliers', label: 'Proveedores', icon: Tag },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon }
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="fixed lg:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-40 shadow-xl"
      >
        <div className="flex flex-col h-full pt-20">
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setCurrentView(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
    </motion.aside>
    </>
  );
}

// Componente Main Content
function MainContent() {
  const { currentView } = useApp();

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'inventory' && <Inventory />}
          {currentView === 'sales' && <Sales />}
          {currentView === 'orders' && <Orders />}
          {currentView === 'suppliers' && <Suppliers />}
          {currentView === 'reports' && <Reports />}
          {currentView === 'settings' && <Settings />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

// Vista Dashboard
function Dashboard() {
  const { products, sales, orders } = useApp();

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pendiente').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Dashboard
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Resumen general de tu negocio de repuestos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Inventario</CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs text-blue-600 mt-1">{products.length} productos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">{sales.length} ventas registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-orange-600 mt-1">Productos requieren reposición</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
            <Clock className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-purple-600 mt-1">Órdenes por completar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Ventas Semanales
            </CardTitle>
            <CardDescription>Últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Lun', ventas: 4500 },
                { name: 'Mar', ventas: 6200 },
                { name: 'Mié', ventas: 5800 },
                { name: 'Jue', ventas: 7100 },
                { name: 'Vie', ventas: 8900 },
                { name: 'Sáb', ventas: 6400 },
                { name: 'Dom', ventas: 3200 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ventas" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-orange-600" />
              Distribución por Categoría
            </CardTitle>
            <CardDescription>Productos en inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Filtros', value: 30 },
                    { name: 'Frenos', value: 25 },
                    { name: 'Electricidad', value: 20 },
                    { name: 'Lubricantes', value: 15 },
                    { name: 'Otros', value: 10 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Filtros', value: 30 },
                    { name: 'Frenos', value: 25 },
                    { name: 'Electricidad', value: 20 },
                    { name: 'Lubricantes', value: 15 },
                    { name: 'Otros', value: 10 }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map(product => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-orange-200 dark:border-orange-800"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Stock actual: {product.stock} unidades
                    </p>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                    Reponer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Vista de Inventario
function Inventory() {
  const { products, setProducts } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    code: '',
    stock: '',
    minStock: '',
    buyPrice: '',
    sellPrice: '',
    brand: '',
    location: ''
  });

  const filteredProducts = products.filter(p => {
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Set(products.map(p => p.category))];

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: String(products.length + 1),
      name: formData.name,
      category: formData.category,
      code: formData.code,
      qrCode: `QR-${formData.code}`,
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      buyPrice: parseFloat(formData.buyPrice),
      sellPrice: parseFloat(formData.sellPrice),
      brand: formData.brand,
      location: formData.location
    };
    setProducts([...products, newProduct]);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      code: '',
      stock: '',
      minStock: '',
      buyPrice: '',
      sellPrice: '',
      brand: '',
      location: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2">
            Inventario
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Gestiona tu stock de repuestos
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-sm md:text-base"
        >
          <Plus className="h-4 w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Agregar Producto</span>
          <span className="sm:hidden">Agregar</span>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredProducts.map(product => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {product.brand} - {product.category}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingProduct(product)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Código:</span>
                  <span className="font-mono font-bold text-sm">{product.code}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Stock:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      product.stock <= product.minStock 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {product.stock} uds
                    </span>
                    {product.stock <= product.minStock && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Precio Venta:</span>
                  <span className="font-bold text-green-600">
                    ${product.sellPrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Ubicación:</span>
                  <span className="text-sm font-medium">{product.location}</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <QrCode className="h-4 w-4 mr-1" />
                    Ver QR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Stock
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <CardHeader>
              <CardTitle>Agregar Nuevo Producto</CardTitle>
              <CardDescription>Complete la información del repuesto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Nombre del Producto</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Filtro de Aceite"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    placeholder="Ej: Bosch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Ej: Filtros"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="Ej: FLT-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock Inicial</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio Compra</Label>
                  <Input
                    type="number"
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio Venta</Label>
                  <Input
                    type="number"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Ubicación</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Ej: Estante A1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                  onClick={handleAddProduct}
                >
                  Guardar Producto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Sales() {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, completeSale, sales } = useApp();
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
  
  const filteredProducts = products.filter(p => 
    p.stock > 0 && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Punto de Venta
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Registra nuevas ventas y gestiona el carrito
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Historial de Ventas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>Productos Disponibles</CardTitle>
              <div className="flex items-center gap-2 mt-4">
                <Search className="h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar producto o escanear código..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-[400px] md:max-h-[600px] overflow-y-auto">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="p-3 md:p-4 border rounded-lg hover:border-orange-500 active:border-orange-600 cursor-pointer transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        <p className="text-xs text-slate-500">{product.code}</p>
                      </div>
                      <Tag className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Stock: {product.stock}
                      </span>
                      <span className="font-bold text-green-600">
                        ${product.sellPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Carrito</span>
                <span className="text-sm font-normal text-slate-500">
                  {cart.length} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Carrito vacío</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            ${item.sellPrice.toLocaleString()} c/u
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 w-6"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-mono font-bold w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7"
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-bold">
                          ${(item.sellPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">
                        ${cartTotal.toLocaleString()}
                      </span>
                    </div>

                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Débito">Débito</SelectItem>
                        <SelectItem value="Crédito">Crédito</SelectItem>
                        <SelectItem value="QR">QR / Mercado Pago</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      onClick={() => {
                        if (paymentMethod === 'QR') {
                          setShowQRModal(true);
                        } else {
                          setShowPaymentModal(true);
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completar Venta
                    </Button>

                    <Button variant="outline" className="w-full">
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir Ticket
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sales.slice().reverse().map(sale => (
                <div
                  key={sale.id}
                  className="p-4 border rounded-lg hover:border-orange-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-mono font-bold">{sale.id}</span>
                      <span className="text-sm text-slate-500 ml-3">{sale.date}</span>
                    </div>
                    <span className="font-bold text-green-600">
                      ${sale.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      {sale.items.length} productos - {sale.paymentMethod}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Pago con QR</CardTitle>
              <CardDescription>Escanea el código para pagar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/fc54346b-1af9-4286-966d-9f8c9bd9770e.png" 
                    alt="Código QR de pago genérico mostrando un patrón de cuadrados negros sobre fondo blanco para escaneo de pago digital" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    ${cartTotal.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Alias: autoparts.manager
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQRModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
                  onClick={() => {
                    completeSale(paymentMethod);
                    setShowQRModal(false);
                    alert('Venta completada exitosamente!');
                  }}
                >
                  Confirmar Pago
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Venta</CardTitle>
              <CardDescription>Resumen del pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">${cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Método de pago:</span>
                  <span className="font-medium">{paymentMethod}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">${cartTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
                  onClick={() => {
                    completeSale(paymentMethod);
                    setShowPaymentModal(false);
                    alert('Venta completada exitosamente!');
                  }}
                >
                  Confirmar Venta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Orders() {
  const { orders, setOrders, suppliers, products } = useApp();
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const markOrderCompleted = (orderId: string) => {
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { ...order, status: 'Completado' }
        : order
    ));
  };

  const sendWhatsAppOrder = (order: Order) => {
    const supplier = suppliers.find(s => s.id === order.supplierId);
    if (supplier) {
      const message = `Hola! Necesito realizar un pedido:\n\n${order.products.map(p => `- ${p.productName}: ${p.quantity} unidades`).join('\n')}\n\nGracias!`;
      const phone = supplier.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Gestión de Pedidos
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Pedidos sugeridos y órdenes de compra
          </p>
        </div>
        <Button
          onClick={() => setShowAddOrderModal(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No hay pedidos pendientes</p>
            </CardContent>
          </Card>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" />
                      Orden {order.id}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {order.date} - {order.supplier}
                    </CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'Pendiente'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.products.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className="text-sm">{item.productName}</span>
                      <span className="font-medium">{item.quantity} unidades</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-green-600 hover:bg-green-50"
                    onClick={() => sendWhatsAppOrder(order)}
                    disabled={order.status === 'Completado'}
                  >
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
                    onClick={() => markOrderCompleted(order.id)}
                    disabled={order.status === 'Completado'}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Completar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Crear Nuevo Pedido</CardTitle>
              <CardDescription>Selecciona proveedor y productos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddOrderModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                  onClick={() => setShowAddOrderModal(false)}
                >
                  Crear Pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Suppliers() {
  const { suppliers, setSuppliers } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    products: ''
  });

  const handleAddSupplier = () => {
    const newSupplier: Supplier = {
      id: `SUP${String(suppliers.length + 1).padStart(3, '0')}`,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      products: formData.products.split(',').map(p => p.trim())
    };
    setSuppliers([...suppliers, newSupplier]);
    setShowAddModal(false);
    setFormData({ name: '', phone: '', email: '', address: '', products: '' });
  };

  const sendWhatsApp = (phone: string, supplierName: string) => {
    const message = `Hola ${supplierName}! Quisiera consultar sobre productos disponibles.`;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Proveedores
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Gestiona tus proveedores y contactos
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Proveedor
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {suppliers.map(supplier => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <CardDescription>{supplier.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Teléfono:</span>
                  <span className="font-medium">{supplier.phone}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Productos:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {supplier.products.slice(0, 3).map((product, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-green-600 hover:bg-green-50"
                    onClick={() => sendWhatsApp(supplier.phone, supplier.name)}
                  >
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Agregar Proveedor</CardTitle>
              <CardDescription>Información del proveedor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Distribuidora XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="contacto@proveedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label>Productos (separados por coma)</Label>
                <Textarea
                  value={formData.products}
                  onChange={(e) => setFormData({...formData, products: e.target.value})}
                  placeholder="Filtros, Frenos, Aceites"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', phone: '', email: '', address: '', products: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                  onClick={handleAddSupplier}
                >
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Reports() {
  const { exportToPDF } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Reportes y Documentos
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Genera y exporta reportes en PDF
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportToPDF('Inventario')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-blue-600" />
              Reporte de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Listado completo de productos con stock y valores
            </p>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportToPDF('Ventas')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Reporte de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Historial de ventas con totales y métodos de pago
            </p>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportToPDF('Pedidos')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-orange-600" />
              Órdenes de Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Pedidos pendientes y completados
            </p>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportToPDF('Remito')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Printer className="h-5 w-5 text-purple-600" />
              Remitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Generar remitos de entrega
            </p>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportToPDF('Factura')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-red-600" />
              Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Comprobantes de venta y facturación
            </p>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => exportToPDF('Estadísticas')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Estadísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Análisis de ventas y rendimiento
            </p>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Settings() {
  const { darkMode, setDarkMode, currentUser } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Configuración
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Ajusta las preferencias del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mi Perfil</CardTitle>
          <CardDescription>Información de usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <img 
              src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/8079b1f6-1f7d-41df-8788-ea14d7310d6d.png" 
              alt="Foto de perfil circular del usuario administrador mostrando avatar genérico con fondo azul claro" 
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h3 className="font-bold text-lg">{currentUser.name}</h3>
              <p className="text-sm text-slate-500">{currentUser.email}</p>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs font-medium">
                {currentUser.role === 'developer' ? 'Desarrollador' : 
                 currentUser.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre Completo</Label>
            <Input defaultValue={currentUser.name} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" defaultValue={currentUser.email} />
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-red-600">
            Actualizar Perfil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Personaliza el aspecto de la aplicación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Modo Oscuro</Label>
              <p className="text-sm text-slate-500">Activa el tema oscuro</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Local</Label>
            <Input defaultValue="AutoParts Manager" />
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input placeholder="Ingresa la dirección" />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input placeholder="Número de contacto" />
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-red-600">
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <Archive className="h-4 w-4 mr-2" />
            Exportar Base de Datos
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar Datos
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600"
            onClick={() => {
              if (confirm('¿Estás seguro de que quieres limpiar todos los datos y cargar datos de ejemplo?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Resetear con Datos de Ejemplo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}