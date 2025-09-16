import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Box,
  Chip,
  Paper,
  Avatar,
  useTheme,
  LinearProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Badge,
  Select,
  MenuItem,
  useMediaQuery,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Collapse,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import { HourglassEmpty } from "@mui/icons-material";
import BusinessIcon from "@mui/icons-material/Business";
import ContactsIcon from "@mui/icons-material/Contacts";
import LinkIcon from "@mui/icons-material/Link";
import {
  Add,
  Edit,
  Delete,
  PhotoCamera,
  Inventory,
  LocalShipping,
  ExpandMore,
  Search,
  TrendingUp,
  Label,
  Description,
  Paid,
  Scale,
  Straighten,
  Storage,
  Warning,
  CheckCircle,
  Cancel,
  Print,
  List,
  FilterList,
  Close,
  Today,
  MoneyOff,
  Pending,
  Refresh
} from "@mui/icons-material";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
  getDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import ShippedOrders from "./ShippedOrders";
import SalesStockReports from "./SalesStockReports";
import styles from "./StockManagement.module.css";
import ImageUpload from "../../components/ImageUpload";
import BarcodeScanner from "./BarcodeScanner";

function StockManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeTab, setActiveTab] = useState("products");
  const [activeView, setActiveView] = useState("products");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [requestedSales, setRequestedSales] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProduct, setNewProduct] = useState({
    sku: "",
    barcode: "",
    name: "",
    description: "",
    imageUrls: [],
    category: "",
    subcategory: "",
    variations: [{ size: "", color: "", model: "", stock: 0 }],
    costPrice: "",
    salePrice: "",
    discount: "",
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    minStock: 1,
    location: "",
    reservedStock: 0,
    supplierId: "",
    enabled: true,
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    productsSupplied: [],
  });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    subcategories: [],
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState({});
  const [deliveredSales, setDeliveredSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [users, setUsers] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    minStock: '',
    maxStock: '',
    minPrice: '',
    maxPrice: '',
    lowStockOnly: false,
    hasDiscount: false,
    showDisabled: false,
  });
  const [editSuccess, setEditSuccess] = useState(false);
  const [expandedProductForm, setExpandedProductForm] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentNotifications, setPaymentNotifications] = useState([]);
  const [refundDialog, setRefundDialog] = useState({ open: false, payment: null });
  const [financialData, setFinancialData] = useState({
    dailyRevenue: 0,
    monthlyRevenue: 0,
    averageTicket: 0,
    conversionRate: 0
  });
  const [userOrders, setUserOrders] = useState([]);
  const formRef = useRef(null);
  const [trackingLinks, setTrackingLinks] = useState({});
const [editingTracking, setEditingTracking] = useState(null);
const handleTrackingLinkSubmit = async (saleId, trackingNumber, carrier) => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userInfo = {
      uid: currentUser?.uid || '',
      name: currentUser?.displayName || currentUser?.email || '',
      email: currentUser?.email || '',
    };

    await updateDoc(doc(db, "sales", saleId), {
      tracking: {
        number: trackingNumber,
        carrier: carrier,
        updatedAt: new Date(),
        updatedBy: userInfo
      },
      status: "Enviado",
      updatedBy: userInfo,
      updatedAt: new Date(),
    });

    setTrackingLinks(prev => ({
      ...prev,
      [saleId]: { number: trackingNumber, carrier }
    }));

    setEditingTracking(null);
    alert('Link de rastreio adicionado com sucesso!');
  } catch (error) {
    console.error("Erro ao adicionar link de rastreio:", error);
    alert('Erro ao adicionar link de rastreio');
  }
};

  // Função para aplicar os filtros
  const applyFilters = (product) => {
    if (filters.category && product.category !== filters.category) {
      return false;
    }
    
    if (filters.subcategory && product.subcategory !== filters.subcategory) {
      return false;
    }
    
    const totalStock = product.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    if (filters.minStock && totalStock < parseInt(filters.minStock)) {
      return false;
    }
    
    if (filters.maxStock && totalStock > parseInt(filters.maxStock)) {
      return false;
    }
    
    if (filters.minPrice && parseFloat(product.salePrice) < parseFloat(filters.minPrice)) {
      return false;
    }
    
    if (filters.maxPrice && parseFloat(product.salePrice) > parseFloat(filters.maxPrice)) {
      return false;
    }
    
    if (filters.lowStockOnly && totalStock >= product.minStock) {
      return false;
    }
    
    if (filters.hasDiscount && (!product.discount || product.discount <= 0)) {
      return false;
    }
    
    // Filtro de status
    if (filters.showDisabled === false && !product.enabled) {
      return false; // Só ativos
    }
    if (filters.showDisabled === true && product.enabled) {
      return false; // Só desativados
    }
    // Se showDisabled for 'all' ou undefined, mostra todos

    return true;
  };

  // Resetar filtros
  const resetFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      minStock: '',
      maxStock: '',
      minPrice: '',
      maxPrice: '',
      lowStockOnly: false,
      hasDiscount: false,
      showDisabled: false,
    });
  };

  // Obter categorias únicas para o filtro
  const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
  
  // Obter subcategorias únicas baseadas na categoria selecionada
  const uniqueSubcategories = filters.category 
    ? [...new Set(
        products
          .filter(p => p.category === filters.category)
          .map(p => p.subcategory)
      )].filter(Boolean)
    : [];

  // Alternar status do produto (ativo/inativo)
  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "products", productId), {
        enabled: !currentStatus,
        updatedBy: userInfo,
        updatedAt: new Date(),
      });
      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, enabled: !currentStatus } : p
        )
      );
    } catch (error) {
      console.error("Error toggling product status:", error);
    }
  };

  // Função para verificar status de pagamento
  const checkPaymentStatus = async (saleId) => {
    try {
      const response = await fetch(`/api/payments/${saleId}`);
      if (!response.ok) throw new Error('Erro ao buscar status');
      const paymentData = await response.json();
      return paymentData.status || 'unknown';
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      return 'unknown';
    }
  };

  // Função para processar reembolsos
  const handleRefund = async (paymentId, reason = "Reembolso solicitado pelo admin") => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        alert('Reembolso processado com sucesso!');
        fetchPayments(); // Atualizar a lista de pagamentos
        setRefundDialog({ open: false, payment: null });
      } else {
        alert('Erro ao processar reembolso');
      }
    } catch (error) {
      console.error('Erro no reembolso:', error);
    }
  };

  // Buscar pagamentos
  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments');
      if (!response.ok) throw new Error('Erro ao buscar pagamentos');
      const paymentsData = await response.json();
      setPayments(paymentsData.payments || []);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
    }
  };

  // Buscar dados financeiros
  const fetchFinancialData = async () => {
    try {
      // Calcular métricas básicas
      const approvedPayments = payments.filter(p => p.status === 'approved');
      const dailyRevenue = approvedPayments
        .filter(p => {
          const paymentDate = new Date(p.createdAt);
          const today = new Date();
          return paymentDate.toDateString() === today.toDateString();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      const monthlyRevenue = approvedPayments
        .filter(p => {
          const paymentDate = new Date(p.createdAt);
          const today = new Date();
          return paymentDate.getMonth() === today.getMonth() && 
                 paymentDate.getFullYear() === today.getFullYear();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      const averageTicket = approvedPayments.length > 0 
        ? approvedPayments.reduce((acc, curr) => acc + curr.amount, 0) / approvedPayments.length 
        : 0;

      setFinancialData({
        dailyRevenue,
        monthlyRevenue,
        averageTicket,
        conversionRate: approvedPayments.length / Math.max(payments.length, 1) * 100
      });
    } catch (error) {
      console.error('Erro ao calcular dados financeiros:', error);
    }
  };

  // Buscar pedidos do usuário atual
// StockManagement.js - fetchUserOrders CORRIGIDA (sem ordenação)
const fetchUserOrders = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    console.log('🔄 Buscando pedidos do usuário...');
    
    if (currentUser) {
      // REMOVER a ordenação para evitar o erro de índice temporariamente
      const salesQuery = query(
        collection(db, "sales"),
        where("userId", "==", currentUser.uid)
        // orderBy("createdAt", "desc") // REMOVIDO temporariamente
      );
      
      const paymentsQuery = query(
        collection(db, "payments"),
        where("userId", "==", currentUser.uid)
        // orderBy("createdAt", "desc") // REMOVIDO temporariamente
      );

      const [salesSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(salesQuery),
        getDocs(paymentsQuery)
      ]);

      console.log('📊 Resultado sales:', salesSnapshot.docs.length, 'documentos');
      console.log('📊 Resultado payments:', paymentsSnapshot.docs.length, 'documentos');

      // Combinar resultados e ordenar manualmente
      const allOrders = [
        ...salesSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'sale',
          // Garantir que temos uma data para ordenação
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt || new Date())
        })),
        ...paymentsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'payment',
          // Garantir que temos uma data para ordenação
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt || new Date())
        }))
      ].sort((a, b) => {
        const dateA = a.createdAt?.getTime?.() || new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.getTime?.() || new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Ordenar do mais recente para o mais antigo
      });

      console.log('🎯 Total de pedidos encontrados:', allOrders.length);
      setUserOrders(allOrders);
    }
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos:", error);
    
    // Fallback: buscar todos e filtrar localmente
    try {
      console.log('🔄 Tentando fallback...');
      const [allSales, allPayments] = await Promise.all([
        getDocs(collection(db, "sales")),
        getDocs(collection(db, "payments"))
      ]);
      
      const filteredSales = allSales.docs
        .filter(doc => doc.data().userId === auth.currentUser.uid)
        .map(doc => ({ id: doc.id, ...doc.data(), type: 'sale' }));
      
      const filteredPayments = allPayments.docs
        .filter(doc => doc.data().userId === auth.currentUser.uid)
        .map(doc => ({ id: doc.id, ...doc.data(), type: 'payment' }));
      
      const fallbackOrders = [...filteredSales, ...filteredPayments]
        .sort((a, b) => {
          const dateA = a.createdAt?.getTime?.() || new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.getTime?.() || new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      
      console.log('🔄 Fallback - pedidos encontrados:', fallbackOrders.length);
      setUserOrders(fallbackOrders);
    } catch (fallbackError) {
      console.error('❌ Fallback também falhou:', fallbackError);
    }
  }
};

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };

    fetchUsers();
    fetchPayments();
    fetchUserOrders();
  }, []);

  useEffect(() => {
    if (payments.length > 0) {
      fetchFinancialData();
    }
  }, [payments]);

  const makeAdmin = async (userId) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "users", userId), {
        role: "admin",
        updatedBy: userInfo,
        updatedAt: new Date(),
      });
      alert("Usuário promovido a admin com sucesso!");
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: "admin" } : user
        )
      );
    } catch (error) {
      console.error("Erro ao promover usuário:", error);
      alert("Erro ao promover usuário.");
    }
  };
//area de produtos
const [trackingDialog, setTrackingDialog] = useState({ open: false, order: null });
const [trackingNumber, setTrackingNumber] = useState('');
const updateTrackingNumber = async (orderId, trackingNumber) => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userInfo = {
      uid: currentUser?.uid || '',
      name: currentUser?.displayName || currentUser?.email || '',
      email: currentUser?.email || '',
    };

    await updateDoc(doc(db, "sales", orderId), {
      trackingNumber: trackingNumber,
      shippingStatus: trackingNumber ? 'shipped' : 'pending',
      updatedBy: userInfo,
      updatedAt: new Date(),
    });

    // Atualizar estado local
    setUserOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, trackingNumber, shippingStatus: 'shipped' } : order
    ));

    setTrackingDialog({ open: false, order: null });
    setTrackingNumber('');
    alert('Código de rastreamento atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar rastreamento:', error);
    alert('Erro ao atualizar código de rastreamento');
  }
};
  // Filtrar, buscar e ordenar produtos
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch && applyFilters(product);
    })
    .sort((a, b) => {
      const aDate = a.createdAt && typeof a.createdAt.toDate === "function"
    ? a.createdAt.toDate().getTime()
    : new Date(a.createdAt || 0).getTime();
  const bDate = b.createdAt && typeof b.createdAt.toDate === "function"
    ? b.createdAt.toDate().getTime()
    : new Date(b.createdAt || 0).getTime();
  return bDate - aDate;
    });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const filteredSales = sales.filter((sale) => {
    if (filter === "pending" && sale.shipped) return false;
    if (filter === "shipped" && !sale.shipped) return false;

    if (
      search &&
      !sale.user?.details.fullName
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      !sale.id.includes(search)
    )
      return false;

    return true;
  });

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          variations: doc.data().variations || [],
          createdAt: doc.data().createdAt || new Date(),
          enabled: doc.data().enabled !== undefined ? doc.data().enabled : true,
        }));
        setProducts(productsData);
      }
    );
    const unsubscribeCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesData);
      }
    );
const unsubscribeSales = onSnapshot(
    collection(db, "sales"),
    (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Garantir conversão correta das datas
        createdAt: doc.data().createdAt?.toDate 
          ? doc.data().createdAt.toDate() 
          : new Date(doc.data().createdAt || new Date()),
        date: doc.data().date?.toDate 
          ? doc.data().date.toDate() 
          : new Date(doc.data().date || new Date())
      }));

      console.log('Vendas carregadas do Firestore:', salesData);

      // Filtrar vendas - compatível com ambos os formatos (antigo e novo)
      setSales(salesData.filter((sale) => 
        sale.status === "Pendente" || sale.status === "pending"
      ));
      
      setRequestedSales(salesData.filter((sale) => 
        sale.status === "Solicitada" || sale.status === "requested"
      ));
      
      setDeliveredSales(salesData.filter((sale) => 
        sale.status === "Entregue" || sale.status === "delivered"
      ));
      
      // Calcular total de vendas
      const totalSalesValue = salesData.reduce((acc, sale) => {
        return acc + (sale.total || 0);
      }, 0);
      setTotalSales(totalSalesValue);
    },
    (error) => {
      console.error('Erro ao carregar vendas:', error);
    }
  );
    const unsubscribeSuppliers = onSnapshot(
      collection(db, "suppliers"),
      (snapshot) => {
        const suppliersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSuppliers(suppliersData);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribeSuppliers();
      unsubscribeCategories();
    };
  }, []);

  const getProductsBySubcategory = (categoryName, subcategoryName) => {
    return products.filter(
      (product) =>
        product.category === categoryName &&
        product.subcategory === subcategoryName
    );
  };

  const deleteCategory = async (id) => {
    try {
      await deleteDoc(doc(db, "categories", id));
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const saveCategory = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      const categoryData = {
        name: newCategory.name,
        subcategories: newCategory.subcategories,
        ...(editingCategory
          ? {
              updatedBy: userInfo,
              updatedAt: new Date(),
            }
          : {
              createdBy: userInfo,
              createdAt: new Date(),
            }),
    };

    if (editingCategory) {
      await updateDoc(
        doc(db, "categories", editingCategory.id),
        categoryData
      );
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id
            ? { ...categoryData, id: editingCategory.id }
            : cat
        )
      );
    } else {
      const docRef = await addDoc(collection(db, "categories"), categoryData);
      setCategories((prev) => [...prev, { ...categoryData, id: docRef.id }]);
    }

    resetCategoryForm();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    }
  };

  const resetCategoryForm = () => {
    setNewCategory({
      name: "",
      subcategories: [],
    });
    setEditingCategory(null);
  };

  const startEditingCategory = (category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      subcategories: category.subcategories || [],
    });
  };

  const addSubcategory = () => {
    setNewCategory((prev) => ({
      ...prev,
      subcategories: [...prev.subcategories, ""],
    }));
  };

  const handleSubcategoryChange = (index, value) => {
    const updatedSubcategories = [...newCategory.subcategories];
    updatedSubcategories[index] = value;
    setNewCategory((prev) => ({
      ...prev,
      subcategories: updatedSubcategories,
    }));
  };

  const handlePrintOrder = (sale) => {
    const printWindow = window.open("", "_blank");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${sale.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .order-info { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BusStore</h1>
            <h2>Comprovante de Pedido</h2>
          </div>
          
          <div class="order-info">
            <p><strong>Nº do Pedido:</strong> ${sale.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Data:</strong> ${sale.createdAt.toLocaleDateString()} ${sale.createdAt.toLocaleTimeString()}</p>
            <p><strong>Status:</strong> ${sale.status === 'approved' ? 'Aprovado' : sale.status}</p>
            <p><strong>Cliente:</strong> ${sale.userData?.name || sale.userEmail || 'Cliente'}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Preço Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.name} ${item.variation?.size ? `- Tamanho: ${item.variation.size}` : ''} ${item.variation?.color ? `- Cor: ${item.variation.color}` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>R$ ${item.price.toFixed(2)}</td>
                  <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            Total: R$ ${sale.total.toFixed(2)}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: name === "supplierId" ? value : value,
    }));
  };

  const addVariation = () => {
    setNewProduct((prev) => ({
      ...prev,
      variations: [
        ...prev.variations,
        { size: "", color: "", model: "", stock: 0 },
      ],
    }));
  };

  const handleVariationChange = (index, field, value) => {
    const updatedVariations = [...newProduct.variations];
    updatedVariations[index][field] = value;
    setNewProduct((prev) => ({ ...prev, variations: updatedVariations }));
  };

  const saveProduct = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      const totalStock = newProduct.variations.reduce(
        (acc, curr) => acc + (curr.stock || 0),
        0
      );

      const productData = {
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        name: newProduct.name,
        description: newProduct.description,
        imageUrls: newProduct.imageUrls,
        category: newProduct.category,
        subcategory: newProduct.subcategory,
        variations: newProduct.variations.map((v) => ({
          size: v.size,
          color: v.color,
          model: v.model,
          stock: parseInt(v.stock, 10) || 0,
        })),
        costPrice: parseFloat(newProduct.costPrice) || 0,
        salePrice: parseFloat(newProduct.salePrice) || 0,
        discount: parseFloat(newProduct.discount) || 0,
        weight: parseFloat(newProduct.weight) || 0,
        dimensions: {
          length: parseFloat(newProduct.dimensions.length) || 0,
          width: parseFloat(newProduct.dimensions.width) || 0,
          height: parseFloat(newProduct.dimensions.height) || 0,
        },
        minStock: parseInt(newProduct.minStock, 10) || 1,
        location: newProduct.location,
        reservedStock: parseInt(newProduct.reservedStock, 10) || 0,
        supplierId: newProduct.supplierId,
        enabled: newProduct.enabled && totalStock > 0,
        createdAt: editingProduct ? newProduct.createdAt : new Date(),
        // Auditoria:
        ...(editingProduct
          ? {
              updatedBy: userInfo,
              updatedAt: new Date(),
            }
          : {
              createdBy: userInfo,
              createdAt: new Date(),
            }),
      };

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...productData, id: editingProduct.id }
              : p
          )
        );
        setEditSuccess(true);
        setExpandedProductForm(true);
      } else {
        const docRef = await addDoc(collection(db, "products"), productData);
        setProducts((prev) => [...prev, { ...productData, id: docRef.id }]);
        resetForm();
        setExpandedProductForm(false);
      }
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const startEditing = (product) => {
    setActiveView("products");
    setEditingProduct(product);
    setNewProduct({
      ...product,
      variations: product.variations || [],
    });
    setExpandedProductForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleBarcodeScan = (barcode) => {
    setNewProduct((prev) => ({ ...prev, barcode }));
  };

  const handleSupplierInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupplier((prev) => ({ ...prev, [name]: value }));
  };

  const saveSupplier = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      const supplierData = {
        ...newSupplier,
        ...(editingSupplier
          ? {
              updatedBy: userInfo,
              updatedAt: new Date(),
            }
          : {
              createdBy: userInfo,
              createdAt: new Date(),
            }),
    };

    if (editingSupplier) {
      await updateDoc(doc(db, "suppliers", editingSupplier.id), supplierData);
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editingSupplier.id
            ? { ...supplierData, id: editingSupplier.id }
            : s
        )
      );
    } else {
      const docRef = await addDoc(collection(db, "suppliers"), supplierData);
      setSuppliers((prev) => [...prev, { ...supplierData, id: docRef.id }]);
    }
    resetSupplierForm();
  } catch (error) {
    console.error("Error saving supplier:", error);
  }
  };

  const deleteSupplier = async (id) => {
    try {
      await deleteDoc(doc(db, "suppliers", id));
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  const resetSupplierForm = () => {
    setNewSupplier({
      name: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
      productsSupplied: [],
    });
    setEditingSupplier(null);
  };

  const startEditingSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier(supplier);
  };

  const markAsShipped = async (saleId) => {
    try {
      const paymentStatus = await checkPaymentStatus(saleId);
      
      if (paymentStatus !== 'approved') {
        alert('Não é possível enviar pedido com pagamento não aprovado');
        return;
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "sales", saleId), {
        shipped: true,
        status: "Enviado",
        updatedBy: userInfo,
        updatedAt: new Date(),
      });
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, shipped: true, status: "Enviado" } : sale
        )
      );
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const unmarkAsShipped = async (saleId) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "sales", saleId), {
        shipped: false,
        status: "Pendente",
        updatedBy: userInfo,
        updatedAt: new Date(),
      });
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, shipped: false, status: "Pendente" } : sale
        )
      );
    } catch (error) {
      console.error("Erro ao desmarcar como enviado:", error);
    }
  };

  const confirmDelivery = async (saleId) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "sales", saleId), {
        status: "Entregue",
        updatedBy: userInfo,
        updatedAt: new Date(),
      });
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, status: "Entregue" } : sale
        )
      );
    } catch (error) {
      console.error("Erro ao confirmar entrega:", error);
    }
  };

  const confirmRequestedSale = async (saleId) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "sales", saleId), {
        status: "Pendente",
        updatedBy: userInfo,
        updatedAt: new Date(),
      });

      const confirmedSale = requestedSales.find((sale) => sale.id === saleId);
      setRequestedSales((prev) => prev.filter((sale) => sale.id !== saleId));

      setSales((prev) => [...prev, { ...confirmedSale, status: "Pendente" }]);

      setTotalSales((prevTotal) => prevTotal + confirmedSale.total);
    } catch (error) {
      console.error("Erro ao confirmar solicitação:", error);
    }
  };

  const deleteRequestedSale = async (saleId) => {
    try {
      await deleteDoc(doc(db, "sales", saleId));
      setRequestedSales((prev) => prev.filter((sale) => sale.id !== saleId));
    } catch (error) {
      console.error("Erro ao excluir compra solicitada:", error);
    }
  };

  const resetForm = () => {
    setNewProduct({
      sku: "",
      barcode: "",
      name: "",
      description: "",
      imageUrls: [],
      category: "",
      subcategory: "",
      variations: [{ size: "", color: "", model: "", stock: 0 }],
      costPrice: "",
      salePrice: "",
      discount: "",
      weight: "",
      dimensions: { length: "", width: "", height: "" },
      minStock: 0,
      location: "",
      reservedStock: 0,
      supplierId: "",
      enabled: true,
    });
    setEditingProduct(null);
  };

  useEffect(() => {
    if (editSuccess) {
      const timer = setTimeout(() => setEditSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [editSuccess]);

  useEffect(() => {
    const totalStock = newProduct.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    if (totalStock <= 0 && newProduct.enabled) {
      setNewProduct(prev => ({ ...prev, enabled: false }));
    }
    // Opcional: se quiser ativar automaticamente quando adicionar estoque, pode adicionar else if
  }, [newProduct.variations]);

  // Componente para o Dashboard Financeiro
  const FinancialDashboard = () => {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Dashboard Financeiro</Typography>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={fetchFinancialData}
            >
              Atualizar
            </Button>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Receita Diária"
                value={`R$ ${financialData.dailyRevenue.toFixed(2)}`}
                icon={<Today />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Receita Mensal"
                value={`R$ ${financialData.monthlyRevenue.toFixed(2)}`}
                icon={<TrendingUp />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Ticket Médio"
                value={`R$ ${financialData.averageTicket.toFixed(2)}`}
                icon={<Paid />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Taxa de Conversão"
                value={`${financialData.conversionRate.toFixed(1)}%`}
                icon={<CheckCircle />}
                color="warning"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Componente para cartão de métrica
  const MetricCard = ({ title, value, icon, color = "primary" }) => {
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Box sx={{ 
            color: `${color}.main`,
            bgcolor: `${color}.light`,
            p: 2,
            borderRadius: 2
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="700">
              {value}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Componente para Gestão de Pagamentos
  const PaymentManagement = () => {
    const paymentStatusColors = {
      approved: 'success',
      pending: 'warning',
      rejected: 'error',
      refunded: 'info',
      unknown: 'default'
    };

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="700">
            Gestão de Pagamentos
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={fetchPayments}
          >
            Atualizar
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              {payments.map((payment) => (
                <Grid item xs={12} key={payment.paymentId}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600">
                          Pedido: {payment.orderId}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          ID: {payment.paymentId}
                        </Typography>
                        <Chip 
                          label={payment.status} 
                          color={paymentStatusColors[payment.status] || 'default'} 
                          size="small" 
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary" fontWeight="600">
                          R$ {payment.amount.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {payment.status === 'approved' && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => setRefundDialog({ open: true, payment })}
                        >
                          Reembolsar
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Componente para Meus Pedidos
 // StockManagement.js - Componente MyOrders CORRIGIDO
const MyOrders = () => {
  const [localFilter, setLocalFilter] = useState('todos');

  // Função para obter status de entrega com base no código de rastreamento
  const getShippingStatus = (order) => {
    if (order.status === 'delivered' || order.status === 'Entregue') return 'Entregue';
    if (order.trackingNumber) return 'Enviado';
    if (order.status === 'approved') return 'Processando';
    return 'Pendente';
  };

  // Função para obter ícone de status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Entregue': return <CheckCircle color="success" />;
      case 'Enviado': return <LocalShipping color="info" />;
      case 'Processando': return <Pending color="warning" />;
      default: return <HourglassEmpty color="disabled" />;
    }
  };

  // Filtra os pedidos com base no localFilter
  const filteredOrders = userOrders.filter(order => {
    const status = getShippingStatus(order);
    if (localFilter === 'todos') return true;
    return status.toLowerCase() === localFilter.toLowerCase();
  });

  if (userOrders.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <LocalShipping sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Você ainda não fez nenhum pedido
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Quando fizer um pedido, ele aparecerá aqui com todos os detalhes e opções de rastreamento.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="700">
          Meus Pedidos
        </Typography>
        <Chip 
          label={`${filteredOrders.length} pedido(s)`} 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {/* Filtros de Pedidos */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Filtrar por status:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['Todos', 'Pendente', 'Processando', 'Enviado', 'Entregue'].map(status => (
              <Chip
                key={status}
                label={status}
                variant={localFilter === status.toLowerCase() ? 'filled' : 'outlined'}
                color="primary"
                onClick={() => setLocalFilter(status.toLowerCase())}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {filteredOrders.length === 0 ? (
        <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', my: 4 }}>
          Nenhum pedido encontrado com o filtro selecionado.
        </Typography>
      ) : (
        filteredOrders.map(order => {
          const shippingStatus = getShippingStatus(order);

          return (
            <Card key={order.id} sx={{ mb: 3, position: 'relative' }}>
              {/* Header do Pedido */}
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      Pedido #{order.id.slice(0, 8).toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {order.createdAt?.toLocaleDateString?.() || new Date().toLocaleDateString()} • 
                      {order.createdAt?.toLocaleTimeString?.() || new Date().toLocaleTimeString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip 
                      label={shippingStatus}
                      icon={getStatusIcon(shippingStatus)}
                      color={
                        shippingStatus === 'Entregue' ? 'success' :
                        shippingStatus === 'Enviado' ? 'info' :
                        shippingStatus === 'Processando' ? 'warning' : 'default'
                      }
                      variant="outlined"
                    />
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      R$ {order.total?.toFixed(2) || order.transaction_amount?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Informações do Pedido */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      📦 Informações do Pedido
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body2">
                        <strong>ID:</strong> {order.paymentId || order.id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status do Pagamento:</strong> 
                        <Chip 
                          label={order.status === 'approved' ? 'Aprovado' : order.status || 'Processando'} 
                          size="small"
                          color={order.status === 'approved' ? 'success' : 'default'}
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      {order.trackingNumber && (
                        <Typography variant="body2">
                          <strong>Código de Rastreamento:</strong> 
                          <Chip 
                            label={order.trackingNumber} 
                            size="small"
                            color="info"
                            sx={{ ml: 1 }}
                            onDelete={() => window.open(`https://www.linkcorreios.com.br/${order.trackingNumber}`, '_blank')}
                            deleteIcon={<LinkIcon />}
                          />
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      💳 Informações de Pagamento
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body2">
                        <strong>Método:</strong> {order.paymentMethod || 'Cartão de Crédito'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Parcelas:</strong> {order.installments || 1}x
                      </Typography>
                      {order.paymentDate && (
                        <Typography variant="body2">
                          <strong>Data do Pagamento:</strong> {new Date(order.paymentDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {/* Itens do Pedido */}
                {order.items && order.items.length > 0 && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      🛒 Itens do Pedido
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {order.items.map((item, index) => (
                        <Box key={index} sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          py: 1,
                          borderBottom: index < order.items.length - 1 ? 1 : 0,
                          borderColor: 'divider'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              src={item.image} 
                              variant="rounded" 
                              sx={{ width: 50, height: 50 }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight="500">
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {item.variation?.size && `Tamanho: ${item.variation.size} `}
                                {item.variation?.color && `Cor: ${item.variation.color}`}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2">
                              {item.quantity} x R$ {item.price.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" fontWeight="600">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}

                {/* Ações do Pedido */}
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handlePrintOrder(order)}
                      startIcon={<Print />}
                    >
                      Imprimir
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {order.trackingNumber && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => window.open(`https://www.linkcorreios.com.br/${order.trackingNumber}`, '_blank')}
                        startIcon={<LinkIcon />}
                      >
                        Rastrear Pedido
                      </Button>
                    )}
                    
                    {order.status === 'approved' && !order.trackingNumber && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setTrackingDialog({ open: true, order })}
                      >
                        Adicionar Rastreamento
                      </Button>
                    )}
                    
                    {shippingStatus === 'Enviado' && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => confirmDelivery(order.id)}
                      >
                        Confirmar Recebimento
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Diálogo para adicionar código de rastreamento */}
      <Dialog open={trackingDialog.open} onClose={() => setTrackingDialog({ open: false, order: null })}>
        <DialogTitle>Adicionar Código de Rastreamento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Para o pedido: #{trackingDialog.order?.id.slice(0, 8).toUpperCase()}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Código de Rastreamento"
            type="text"
            fullWidth
            variant="outlined"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Ex: PL123456789BR"
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Insira o código fornecido pela transportadora
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingDialog({ open: false, order: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={() => updateTrackingNumber(trackingDialog.order?.id, trackingNumber)}
            variant="contained"
            disabled={!trackingNumber}
          >
            Salvar Código
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

  return (
    <div className={styles.container}>
      <Snackbar
        open={editSuccess}
        autoHideDuration={3000}
        onClose={() => setEditSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setEditSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Edição concluída com sucesso!
        </Alert>
      </Snackbar>
      
      {/* Diálogo de Reembolso */}
      <Dialog open={refundDialog.open} onClose={() => setRefundDialog({ open: false, payment: null })}>
        <DialogTitle>Confirmar Reembolso</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja reembolsar o pagamento {refundDialog.payment?.paymentId} no valor de 
            R$ {refundDialog.payment?.amount.toFixed(2)}?
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo do reembolso"
            type="text"
            fullWidth
            variant="outlined"
            defaultValue="Reembolso solicitado pelo admin"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog({ open: false, payment: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={() => handleRefund(refundDialog.payment?.paymentId, "Reembolso solicitado pelo admin")}
            color="error"
          >
            Confirmar Reembolso
          </Button>
        </DialogActions>
      </Dialog>

      <NavBar />
      <Box
        sx={{
          display: "flex",
          maxWidth: 1440,
          margin: "auto",
          bgcolor: "background.default",
        }}
      >
        {/* Sidebar */}
        <Paper
          sx={{
            width: 280,
            p: 2,
            m: 2,
            borderRadius: 4,
            bgcolor: "background.paper",
            position: "sticky",
            top: 80,
            height: "fit-content",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Funcionalidades
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              { id: "products", icon: <Inventory />, label: "Produtos" },
              { id: "productList", icon: <List />, label: "Lista de Produtos" },
              
              { id: "suppliers", icon: <BusinessIcon />, label: "Fornecedores" },
              { id: "myOrders", icon: <LocalShipping />, label: "Meus Pedidos" },
              { id: "payments", icon: <Paid />, label: "Pagamentos" },
              { id: "reports", icon: <TrendingUp />, label: "Relatórios" },
            ].map((item) => (
              <Button
                key={item.id}
                startIcon={item.icon}
                onClick={() => setActiveView(item.id)}
                variant={activeView === item.id ? "contained" : "text"}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  borderRadius: 3,
                  bgcolor:
                    activeView === item.id ? "primary.light" : "transparent",
                  color:
                    activeView === item.id ? "primary.main" : "text.secondary",
                  "&:hover": {
                    bgcolor:
                      activeView === item.id ? "primary.light" : "action.hover",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Main Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: 4,
            "& .MuiCard-root": { borderRadius: 4 },
            "& .MuiPaper-root": { borderRadius: 4 },
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab value="products" label="Produtos" />
            <Tab value="users" label="Usuários" />
            <Tab value="finance" label="Financeiro" />
          </Tabs>

          <Box sx={{ mt: 4 }}>
            {activeTab === "products" && (
              <>
                {activeView === "products" && (
                  <>
                    {/* Products Section */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 4,
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Inventory
                          sx={{
                            fontSize: 40,
                            color: theme.palette.primary.main,
                            bgcolor: theme.palette.primary.light,
                            p: 1.5,
                            borderRadius: 4,
                          }}
                        />
                        <Typography variant="h4" fontWeight="700">
                          Gestão de Estoque
                        </Typography>
                      </Box>
                    </Box>

                    {/* Search Bar */}
                    <Box sx={{ mb: 4 }}>
                      <TextField
                        variant="outlined"
                        placeholder="Pesquisar produtos por nome, SKU ou categoria..."
                        InputProps={{
                          startAdornment: <Search sx={{ color: "action.active", mr: 1 }} />,
                        }}
                        sx={{ width: "100%" }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </Box>

                    {/* Stats Cards */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      {[
                        {
                          icon: <TrendingUp sx={{ fontSize: 40, color: theme.palette.success.main }} />,
                          label: "Vendas Totales",
                          value: `R$ ${totalSales.toFixed(2)}`,
                        },
                        {
                          icon: <Storage sx={{ fontSize: 40, color: theme.palette.info.main }} />,
                          label: "Produtos Cadastrados",
                          value: products.length,
                        },
                        {
                          icon: <Warning sx={{ fontSize: 40, color: theme.palette.error.main }} />,
                          label: "Produtos com Baixo Estoque",
                          value: products.filter((p) => p.variations.reduce((acc, curr) => acc + curr.stock, 0) < p.minStock).length,
                        },
                      ].map((stat, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Card variant="outlined">
                            <CardContent sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                              {stat.icon}
                              <Box>
                                <Typography variant="subtitle2" color="textSecondary">
                                  {stat.label}
                                </Typography>
                                <Typography variant="h4" fontWeight="700">
                                  {stat.value}
                                </Typography>
                                
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Categories Form */}
                    <Card sx={{ mb: 4 }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                          Lista de Categorias
                          <Chip
                            label={`${categories.length} categorias`}
                            size="small"
                            sx={{ ml: 2, bgcolor: "action.selected" }}
                          />
                        </Typography>

                        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => {
                              setEditingCategory(null);
                              setNewCategory({ name: "", subcategories: [] });
                            }}
                          >
                            Adicionar Categoria
                          </Button>
                        </Box>

                        <Box sx={{ maxHeight: 400, overflowY: "auto", mb: 2 }}>
                          <Grid container spacing={2}>
                            {categories.map((category) => (
                              <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                                <Card variant="outlined" sx={{ p: 1 }}>
                                  <CardContent sx={{ p: 1 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <Box>
                                        <Typography variant="subtitle2" fontWeight="600">
                                          {category.name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                          Subcategorias: {category.subcategories.length}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 1 }}>
                                        <IconButton size="small" onClick={() => startEditingCategory(category)}>
                                          <Edit fontSize="small" color="info" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => deleteCategory(category.id)}>
                                          <Delete fontSize="small" color="error" />
                                        </IconButton>
                                      </Box>
                                    </Box>

                                    <Box sx={{ mt: 1 }}>
                                      {category.createdBy && (
                                        <Typography variant="caption" color="textSecondary" display="block">
                                          Criado por: {category.createdBy.name || "Desconhecido"}
                                          {category.createdAt && (
                                            <> em {category.createdAt.seconds
                                              ? new Date(category.createdAt.seconds * 1000).toLocaleString()
                                              : new Date(category.createdAt).toLocaleString()}
                                            </>
                                          )}
                                        </Typography>
                                      )}
                                      {category.updatedBy && (
                                        <Typography variant="caption" color="textSecondary" display="block">
                                          Editado por: {category.updatedBy.name || "Desconhecido"}
                                          {category.updatedAt && (
                                            <> em {category.updatedAt.seconds
                                              ? new Date(category.updatedAt.seconds * 1000).toLocaleString()
                                              : new Date(category.updatedAt).toLocaleString()}
                                            </>
                                          )}
                                        </Typography>
                                      )}
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Card sx={{ mt: 4 }}>
                          <CardContent>
                            <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                            </Typography>
                            <Grid container spacing={3}>
                              <Grid item xs={12}>
                                <TextField
                                  label="Nome da Categoria"
                                  name="name"
                                  value={newCategory.name}
                                  onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                                  fullWidth
                                  size="small"
                                  variant="filled"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="subtitle1" color="primary" sx={{ mb: 2 }}>
                                  Subcategorias
                                </Typography>
                                {newCategory.subcategories.map((subcat, index) => (
                                  <Box key={index} sx={{ display: "flex", gap: 2, mb: 2 }}>
                                    <TextField
                                      label={`Subcategoria ${index + 1}`}
                                      value={subcat}
                                      onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                                      fullWidth
                                      size="small"
                                      variant="filled"
                                    />
                                    <IconButton
                                      onClick={() => {
                                        const updatedSubcategories = newCategory.subcategories.filter((_, i) => i !== index);
                                        setNewProduct((prev) => ({ ...prev, subcategories: updatedSubcategories }));
                                      }}
                                    >
                                      <Delete fontSize="small" color="error" />
                                    </IconButton>
                                  </Box>
                                ))}
                                <Button variant="outlined" startIcon={<Add />} onClick={addSubcategory} size="small">
                                  Adicionar Subcategoria
                                </Button>
                              </Grid>
                              <Grid item xs={12}>
                                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", borderTop: 1, borderColor: "divider", pt: 3 }}>
                                  <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={resetCategoryForm}>
                                    Cancelar
                                  </Button>
                                  <Button variant="contained" startIcon={<CheckCircle />} onClick={saveCategory} sx={{ minWidth: 200 }}>
                                    Salvar Categoria
                                  </Button>
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </CardContent>
                    </Card>

                    {/* Product Form */}
                    <Card sx={{ mb: 4 }}>
                      <CardContent>
                        <Accordion 
  expanded={activeView === "products" && expandedProductForm}
  onChange={() => setExpandedProductForm(!expandedProductForm)}
  elevation={0}
>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="h6" fontWeight="600">
                              {editingProduct ? "Editar Produto" : "Novo Produto"}
                            </Typography>
                          </AccordionSummary>

                          <AccordionDetails>
                            <Grid container spacing={3}>
                              <Grid item xs={12}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mb: 3,
                                  }}
                                >
                                  <Label fontSize="small" color="primary" />
                                  <Typography variant="subtitle1" color="primary">
                                    Informações Básicas
                                  </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                  {["sku", "name"].map((field) => (
                                    <Grid item xs={12} md={6} key={field}>
                                      <TextField
                                        label={field === "sku" ? "SKU" : "Nome"}
                                        name={field}
                                        value={newProduct[field]}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        variant="filled"
                                      />
                                    </Grid>
                                  ))}

                                  <Grid item xs={12}>
                                    <TextField
                                      label="Descrição do Produto"
                                      name="description"
                                      value={newProduct.description}
                                      onChange={handleInputChange}
                                      fullWidth
                                      multiline
                                      minRows={3}
                                      size="small"
                                      variant="filled"
                                    />
                                  </Grid>

                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      label="Código de Barras"
                                      name="barcode"
                                      value={newProduct.barcode}
                                      onChange={handleInputChange}
                                      fullWidth
                                      size="small"
                                      variant="filled"
                                    />
                                    <BarcodeScanner onScan={handleBarcodeScan} />
                                  </Grid>

                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      select
                                      label="Categoria"
                                      name="category"
                                      value={newProduct.category}
                                      onChange={handleInputChange}
                                      fullWidth
                                      size="small"
                                      variant="filled"
                                      SelectProps={{
                                        native: true,
                                      }}
                                    >
                                      <option value=""></option>
                                      {categories.map((category) => (
                                        <option
                                          key={category.id}
                                          value={category.name}
                                        >
                                          {category.name}
                                        </option>
                                      ))}
                                    </TextField>
                                  </Grid>

                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      select
                                      label="Subcategoria"
                                      name="subcategory"
                                      value={newProduct.subcategory}
                                      onChange={handleInputChange}
                                      fullWidth
                                      size="small"
                                      variant="filled"
                                      disabled={!newProduct.category}
                                      SelectProps={{
                                        native: true,
                                      }}
                                    >
                                      <option value=""></option>
                                      {categories
                                        .find(
                                          (cat) => cat.name === newProduct.category
                                        )
                                        ?.subcategories.map(
                                          (subcat, index) => (
                                            <option key={index} value={subcat}>
                                              {subcat}
                                            </option>
                                          )
                                        )}
                                    </TextField>
                                  </Grid>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                  <TextField
                                    select
                                    label="Fornecedor"
                                    name="supplierId"
                                    value={newProduct.supplierId}
                                    onChange={handleInputChange}
                                    fullWidth
                                    size="small"
                                    variant="filled"
                                    SelectProps={{
                                      native: true,
                                    }}
                                  >
                                    <option value=""></option>
                                    {suppliers.map((supplier) => (
                                      <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                      </option>
                                    ))}
                                  </TextField>
                                </Grid>
                              </Grid>
                              <Grid item xs={12}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mb: 3,
                                  }}
                                >
                                  <PhotoCamera fontSize="small" color="primary" />
                                  <Typography variant="subtitle1" color="primary">
                                    Fotos do Produto
                                  </Typography>
                                </Box>
                                <ImageUpload
                                  onImageUpload={(imageUrl) =>
                                    setNewProduct((prev) => ({
                                      ...prev,
                                      imageUrls: [...prev.imageUrls, imageUrl],
                                    }))
                                  }
                                />
                                <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                                  {newProduct.imageUrls.map((imageUrl, index) => (
                                    <Box
                                      key={index}
                                      sx={{ position: "relative", display: "inline-block" }}
                                    >
                                      <Avatar
                                        src={imageUrl}
                                        variant="rounded"
                                        sx={{ width: 100, height: 100 }}
                                      />
                                      <IconButton
                                        size="small"
                                        sx={{
                                          position: "absolute",
                                          top: 0,
                                          right: 0,
                                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                                          "&:hover": {
                                            backgroundColor: "rgba(255, 0, 0, 0.8)",
                                          },
                                        }}
                                        onClick={() => {
                                          const updatedImageUrls = newProduct.imageUrls.filter(
                                            (_, i) => i !== index
                                          );
                                          setNewProduct((prev) => ({
                                            ...prev,
                                            imageUrls: updatedImageUrls,
                                          }));
                                        }}
                                      >
                                        <Delete fontSize="small" color="error" />
                                      </IconButton>
                                    </Box>
                                  ))}
                                </Box>
                              </Grid>
                              <Grid item xs={12}>
                                <Divider sx={{ my: 3 }} />
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mb: 3,
                                  }}
                                >
                                  <Paid fontSize="small" color="primary" />
                                  <Typography variant="subtitle1" color="primary">
                                    Preços e Dimensões
                                  </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                  {["costPrice", "salePrice", "discount", "weight"].map((field) => (
                                    <Grid item xs={3} key={field}>
                                      <TextField
                                        label={
                                          field === "costPrice"
                                            ? "Preço de Custo"
                                            : field === "salePrice"
                                            ? "Preço de Venda"
                                            : field === "discount"
                                            ? "Desconto (%)"
                                            : "Peso (kg)"
                                        }
                                        name={field}
                                        value={newProduct[field]}
                                        onChange={handleInputChange}
                                        fullWidth
                                        type={field === "discount" || field === "costPrice" || field === "salePrice" ? "number" : "text"}
                                        InputProps={{
                                          startAdornment: field.includes("Price") && "R$",
                                        }}
                                        size="small"
                                        inputProps={{
                                          min: 0,
                                          max: field === "discount" ? 100 : undefined,
                                        }}
                                      />
                                    </Grid>
                                  ))}

                                  {["length", "width", "height"].map((dim) => (
                                    <Grid item xs={4} key={dim}>
                                      <TextField
                                        label={
                                          dim === "length"
                                            ? "Comprimento (cm)"
                                            : dim === "width"
                                              ? "Largura (cm)"
                                              : "Altura (cm)"
                                        }
                                        name={dim}
                                        value={newProduct.dimensions[dim]}
                                        onChange={(e) =>
                                          setNewProduct((prev) => ({
                                            ...prev,
                                            dimensions: {
                                              ...prev.dimensions,
                                              [dim]: e.target.value,
                                            },
                                          }))
                                        }
                                        fullWidth
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 0 }}
                                      />
                                    </Grid>
                                  ))}
                                </Grid>

                                <Grid item xs={12}>
                                  <Box
                                    sx={{
                                      border: 1,
                                      borderColor: "divider",
                                      borderRadius: 1,
                                      p: 2,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        mb: 2,
                                      }}
                                    >
                                      <Typography variant="subtitle1">
                                        Variações
                                      </Typography>
                                      <Button
                                        variant="outlined"
                                        startIcon={<Add />}
                                        onClick={addVariation}
                                        size="small"
                                      >
                                        Adicionar Variação
                                      </Button>
                                    </Box>
                                    {newProduct.variations.map((variation, index) => (
                                      <Paper
                                        key={index}
                                        elevation={1}
                                        className={styles.variationCard}
                                      >
                                        <Grid container spacing={2}>
                                          {["size", "color", "model", "stock"].map(
                                            (field) => (
                                              <Grid item xs={3} key={field}>
                                                <TextField
                                                  label={
                                                    field === "size"
                                                      ? "Tamanho"
                                                      : field === "color"
                                                        ? "Cor"
                                                        : field === "model"
                                                          ? "Modelo"
                                                          : "Estoque"
                                                  }
                                                  value={variation[field]}
                                                  onChange={(e) =>
                                                    handleVariationChange(
                                                      index,
                                                      field,
                                                      e.target.value
                                                    )
                                                  }
                                                  fullWidth
                                                  size="small"
                                                  type={
                                                    field === "stock"
                                                      ? "number"
                                                      : "text"
                                                  }
                                                  inputProps={{ min: 0 }}
                                                />
                                              </Grid>
                                            )
                                          )}
                                        </Grid>
                                      </Paper>
                                ))}
                                  </Box>
                                  </Grid>
                                  </Grid>

                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={newProduct.enabled}
                                      onChange={(e) => setNewProduct({...newProduct, enabled: e.target.checked})}
                                      disabled={newProduct.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0) <= 0}
                                    />
                                  }
                                  label="Produto ativo no site"
                                  sx={{ mb: 2 }}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 2,
                                    justifyContent: "flex-end",
                                    borderTop: 1,
                                    borderColor: "divider",
                                    pt: 3,
                                  }}
                                >
                                  {editingProduct && (
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      startIcon={<Cancel />}
                                      onClick={() => {
                                        resetForm();
                                        setExpandedProductForm(false);
                                      }}
                                    >
                                      Cancelar Edição
                                    </Button>
                                  )}
                                  <Button
                                    variant="contained"
                                    startIcon={
                                      editingProduct ? <CheckCircle /> : <Add />
                                    }
                                    onClick={saveProduct}
                                    sx={{ minWidth: 200 }}
                                    ref={formRef}
                                  >
                                    {editingProduct
                                      ? "Confirmar Alterações"
                                      : "Adicionar Produto"}
                                  </Button>
                                </Box>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      </CardContent>
                    </Card>
                  </>
                )}

                {activeView === "productList" && (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 4,
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <List
                          sx={{
                            fontSize: 40,
                            color: theme.palette.primary.main,
                            bgcolor: theme.palette.primary.light,
                            p: 1.5,
                            borderRadius: 4,
                          }}
                        />
                        <Typography variant="h4" fontWeight="700">
                          Lista Completa de Produtos
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<FilterList />}
                          onClick={() => setFilterOpen(!filterOpen)}
                          sx={{ minWidth: 120 }}
                        >
                          Filtros
                        </Button>
                        {Object.values(filters).some(val => val !== '' && val !== false) && (
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Close />}
                            onClick={resetFilters}
                          >
                            Limpar
                          </Button>
                        )}
                      </Box>
                    </Box>

                    {/* Filtros avançados */}
                    <Collapse in={filterOpen}>
                      <Card sx={{ mb: 4 }}>
                        <CardContent>
                          <Grid container spacing={3}>
                            {/* Filtro por categoria */}
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Categoria</InputLabel>
                                <Select
                                  value={filters.category}
                                  onChange={(e) => setFilters({...filters, category: e.target.value, subcategory: ''})}
                                  label="Categoria"
                                >
                                  <MenuItem value="">Todas</MenuItem>
                                  {uniqueCategories.map(category => (
                                    <MenuItem key={category} value={category}>{category}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            {/* Filtro por subcategoria */}
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth size="small" disabled={!filters.category}>
                                <InputLabel>Subcategoria</InputLabel>
                                <Select
                                  value={filters.subcategory}
                                  onChange={(e) => setFilters({...filters, subcategory: e.target.value})}
                                  label="Subcategoria"
                                >
                                  <MenuItem value="">Todas</MenuItem>
                                  {uniqueSubcategories.map(subcategory => (
                                    <MenuItem key={subcategory} value={subcategory}>{subcategory}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            {/* Filtro por estoque */}
                            <Grid item xs={12} md={3}>
                              <TextField
                                label="Estoque mínimo"
                                type="number"
                                value={filters.minStock}
                                onChange={(e) => setFilters({...filters, minStock: e.target.value})}
                                fullWidth
                                size="small"
                                inputProps={{ min: 0 }}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                label="Estoque máximo"
                                type="number"
                                value={filters.maxStock}
                                onChange={(e) => setFilters({...filters, maxStock: e.target.value})}
                                fullWidth
                                size="small"
                                inputProps={{ min: 0 }}
                              />
                            </Grid>

                            {/* Filtro por preço */}
                            <Grid item xs={12} md={3}>
                              <TextField
                                label="Preço mínimo (R$)"
                                type="number"
                                value={filters.minPrice}
                                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                                fullWidth
                                size="small"
                                inputProps={{ min: 0, step: "0.01" }}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                label="Preço máximo (R$)"
                                type="number"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                                fullWidth
                                size="small"
                                inputProps={{ min: 0, step: "0.01" }}
                              />
                            </Grid>

                            {/* Seletor de itens por página */}
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Itens por página</InputLabel>
                                <Select
                                  value={itemsPerPage}
                                  onChange={(e) => {
                                    setItemsPerPage(e.target.value);
                                    setCurrentPage(1);
                                  }}
                                  label="Itens por página"
                                >
                                  <MenuItem value={12}>12</MenuItem>
                                  <MenuItem value={24}>24</MenuItem>
                                  <MenuItem value={48}>48</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            {/* Filtros de checkbox */}
                            <Grid item xs={12} md={6}>
                              <FormGroup row>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={filters.lowStockOnly}
                                      onChange={(e) => setFilters({...filters, lowStockOnly: e.target.checked})}
                                    />
                                  }
                                  label="Apenas baixo estoque"
                                />
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={filters.hasDiscount}
                                      onChange={(e) => setFilters({...filters, hasDiscount: e.target.checked})}
                                    />
                                  }
                                  label="Apenas com desconto"
                                />
                              </FormGroup>
                            </Grid>

                            {/* Filtro por status */}
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                  value={filters.showDisabled}
                                  onChange={(e) => setFilters({ ...filters, showDisabled: e.target.value })}
                                  label="Status"
                                >
                                  <MenuItem value={false}>Apenas ativos</MenuItem>
                                  <MenuItem value={true}>Apenas desativados</MenuItem>
                                  <MenuItem value={'all'}>Todos</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Collapse>

                    {/* Barra de pesquisa */}
                    <Box sx={{ mb: 4 }}>
                      <TextField
                        variant="outlined"
                        placeholder="Pesquisar produtos por nome, SKU ou categoria..."
                        InputProps={{
                          startAdornment: <Search sx={{ color: "action.active", mr: 1 }} />,
                        }}
                        sx={{ width: "100%" }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </Box>

                    {/* Contador de resultados */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        {filteredProducts.length} produtos encontrados
                        {Object.values(filters).some(val => val !== '' && val !== false) && 
                          " (com filtros aplicados)"}
                      </Typography>
                    </Box>

                    {/* Lista de produtos */}
                    <Card>
                      <CardContent>
                        <Grid container spacing={3}>
                          {currentProducts.map((product) => {
                            const totalStock = product.variations?.reduce(
                              (acc, curr) => acc + (curr.stock || 0),
                              0
                            );
                            const isLowStock = totalStock < product.minStock;
                            const isOutOfStock = totalStock <= 0;

                            return (
                              <Grid item xs={12} sm={6} md={4} key={product.id}>
                                <Card
                                  variant="outlined"
                                  sx={{
                                    position: "relative",
                                    "&:hover": { boxShadow: 4 },
                                    opacity: product.enabled ? 1 : 0.7,
                                    borderColor: !product.enabled ? "error.main" : "divider",
                                  }}
                                >
                                  {!product.enabled && (
                                    <Chip
                                      label="Desativado"
                                      color="error"
                                      size="small"
                                      sx={{
                                        position: "absolute",
                                        right: 16,
                                        top: 16,
                                        fontWeight: 600,
                                      }}
                                    />
                                  )}
                                  {isLowStock && product.enabled && (
                                    <Chip
                                      label="Baixo Estoque"
                                      color="error"
                                      size="small"
                                      sx={{
                                        position: "absolute",
                                        right: 16,
                                        top: 16,
                                        fontWeight: 600,
                                      }}
                                    />
                                  )}

                                  <CardContent>
                                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                      <Avatar
                                        src={product.imageUrls[0]}
                                        variant="rounded"
                                        sx={{
                                          width: 80,
                                          height: 80,
                                          bgcolor: "background.paper",
                                        }}
                                      >
                                        <PhotoCamera
                                          sx={{ color: "text.disabled" }}
                                        />
                                      </Avatar>

                                      <Box>
                                        <Typography
                                          variant="subtitle1"
                                          fontWeight="600"
                                        >
                                          {product.name}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          color="textSecondary"
                                        >
                                          SKU: {product.sku}
                                        </Typography>
                                        <Chip
                                          label={product.category}
                                          size="small"
                                          sx={{
                                            mt: 1,
                                            bgcolor: "primary.light",
                                            color: "primary.dark",
                                          }}
                                        />
                                      </Box>
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                      <LinearProgress
                                        variant="determinate"
                                        value={
                                          (totalStock / (product.minStock || 1)) * 100
                                        }
                                        color={isLowStock ? "error" : "primary"}
                                        sx={{ height: 8, borderRadius: 4 }}
                                      />
                                      <Box
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          mt: 1,
                                        }}
                                      >
                                        <Typography variant="caption">
                                          Estoque: <strong>{totalStock}</strong>
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="textSecondary"
                                        >
                                          Mín: {product.minStock}
                                        </Typography>
                                      </Box>
                                    </Box>

                                    <Box sx={{ mt: 2 }}>
                                      {Number(product.discount || 0) > 0 ? (
                                        <>
                                          <Typography
                                            variant="body2"
                                            color="textSecondary"
                                            sx={{ textDecoration: "line-through", mr: 1 }}
                                          >
                                            R$ {Number(product.salePrice || 0).toFixed(2)}
                                          </Typography>
                                          <Typography
                                            variant="h6"
                                            color="primary"
                                            sx={{ fontWeight: "bold", display: "inline" }}
                                          >
                                            R$ {(Number(product.salePrice || 0) * (1 - Number(product.discount || 0) / 100)).toFixed(2)}
                                          </Typography>
                                        </>
                                      ) : (
                                        <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
                                          R$ {Number(product.salePrice || 0).toFixed(2)}
                                        </Typography>
                                      )}
                                    </Box>

                                    {/* Auditoria */}
                                    <Box sx={{ mt: 1 }}>
                                      {product.createdBy && (
                                        <Typography variant="caption" color="textSecondary" display="block">
                                          Criado por: {product.createdBy.name || "Desconhecido"}
                                          {product.createdAt && (
                                            <> em {product.createdAt.seconds
                                              ? new Date(product.createdAt.seconds * 1000).toLocaleString()
                                              : new Date(product.createdAt).toLocaleString()}
                                            </>
                                          )}
                                        </Typography>
                                      )}
                                      {product.updatedBy && (
                                        <Typography variant="caption" color="textSecondary" display="block">
                                          Editado por: {product.updatedBy.name || "Desconhecido"}
                                          {product.updatedAt && (
                                            <> em {product.updatedAt.seconds
                                              ? new Date(product.updatedAt.seconds * 1000).toLocaleString()
                                              : new Date(product.updatedAt).toLocaleString()}
                                            </>
                                          )}
                                        </Typography>
                                      )}
                                    </Box>

                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        "& .MuiButton-root": {
                                          flex: 1,
                                          py: 1,
                                        },
                                      }}
                                    >
                                      <Button
                                        variant="outlined"
                                        startIcon={<Edit />}
                                        onClick={() => startEditing(product)}
                                        color="info"
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        color={product.enabled ? "error" : "success"}
                                        startIcon={product.enabled ? <Cancel /> : <CheckCircle />}
                                        onClick={() => {
                                          const totalStock = product.variations?.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                                          if (!product.enabled && totalStock <= 0) {
                                            alert("Não é possível ativar um produto sem estoque!");
                                            return;
                                          }
                                          toggleProductStatus(product.id, product.enabled);
                                        }}
                                      >
                                        {product.enabled ? "Desativar" : "Ativar"}
                                      </Button>
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                        
                        {/* Paginação e controle de itens por página */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Typography variant="body2" color="textSecondary">
                              Itens por página:
                            </Typography>
                            <Select
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(e.target.value);
                                setCurrentPage(1);
                              }}
                              size="small"
                              sx={{ width: 100 }}
                            >
                              <MenuItem value={12}>12</MenuItem>
                              <MenuItem value={24}>24</MenuItem>
                              <MenuItem value={48}>48</MenuItem>
                            </Select>
                          </Box>
                          
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Button
                              variant="outlined"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>
                            <Typography variant="body1">
                              Página {currentPage} de{" "}
                              {Math.ceil(filteredProducts.length / itemsPerPage)}
                            </Typography>
                            <Button
                              variant="outlined"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={
                                currentPage === Math.ceil(filteredProducts.length / itemsPerPage)
                              }
                            >
                              Próxima
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </>
                )}
                {activeView === "suppliers" && (
                  <ShippedOrders
                    sales={sales}
                    markAsShipped={markAsShipped}
                    unmarkAsShipped={unmarkAsShipped}
                    filter={filter}
                    setFilter={setFilter}
                    search={search}
                    setSearch={setSearch}
                    notes={notes}
                    handleNoteChange={handleNoteChange}
                  />
                )}

                {activeView === "orders" && (
                  <ShippedOrders
                    sales={sales}
                    markAsShipped={markAsShipped}
                    unmarkAsShipped={unmarkAsShipped}
                    filter={filter}
                    setFilter={setFilter}
                    search={search}
                    setSearch={setSearch}
                    notes={notes}
                    handleNoteChange={handleNoteChange}
                  />
                )}

                {activeView === "delivered" && (
                  <ShippedOrders
                    sales={deliveredSales}
                    markAsShipped={markAsShipped}
                    unmarkAsShipped={unmarkAsShipped}
                    filter={filter}
                    setFilter={setFilter}
                    search={search}
                    setSearch={setSearch}
                    notes={notes}
                    handleNoteChange={handleNoteChange}
                  />
                )}

                {activeView === "myOrders" && (
                  <MyOrders />
                )}

                {activeView === "payments" && (
                  <PaymentManagement />
                )}

                {activeView === "reports" && (
                  <SalesStockReports
                    products={products}
                    sales={sales}
                    deliveredSales={deliveredSales}
                  />
                )}
              </>
            )}

            {activeTab === "users" && (
              <Box>
                <Typography variant="h4" fontWeight="700" sx={{ mb: 4 }}>
                  Gestão de Usuários
                </Typography>

                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      {users.map((user) => (
                        <Grid item xs={12} md={6} key={user.id}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" fontWeight="600">
                                {user.details.fullName}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {user.email}
                              </Typography>
                            </Box>

                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => makeAdmin(user.id)}
                              disabled={user.role === "admin"}
                              sx={{ minWidth: 120 }}
                            >
                              {user.role === "admin" ? "Admin" : "Promover a Admin"}
                            </Button>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}

            {activeTab === "finance" && (
              <Box>
                <FinancialDashboard />
                <PaymentManagement />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <Footer />
    </div>
  );

}

export default StockManagement;
