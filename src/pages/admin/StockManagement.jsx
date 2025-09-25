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
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  CircularProgress,
  Switch,
  Breadcrumbs,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from "@mui/material";
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
  Category as CategoryIcon,
  Save,
  Paid,
  Storage,
  Warning as WarningIcon,
  CheckCircle,
  Cancel,
  Print,
  List as ListIcon,
  FilterList,
  Close,
  HelpOutline,
  Today,
  Refresh,
  HourglassEmpty as HourglassEmptyIcon,
  Business,
  Link as LinkIcon,
  Dashboard as DashboardIcon,
  People,
  Assessment,
  Settings,
  Logout,
  Notifications,
  History,
  Backup,
  Download,
  AccountCircle,
  Pending,
  Remove,
  TrendingDown
} from "@mui/icons-material";
import { format, subDays, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { db, auth } from "../../firebase";
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
  getDoc,
  startAfter,
  limit
} from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import ShippedOrders from "./ShippedOrders";
import SalesStockReports from "./SalesStockReports";
import styles from "./StockManagement.module.css";
import ImageUpload from "../../components/ImageUpload";
import BarcodeScanner from "./BarcodeScanner";

// Componentes de gráficos
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

// Configuração de cores para gráficos
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  VIEW_PRODUCTS: 'view_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  // Categorias
  VIEW_CATEGORIES: 'view_categories',
  EDIT_CATEGORIES: 'edit_categories',
  DELETE_CATEGORIES: 'delete_categories',
  VIEW_SUPPLIERS: 'view_suppliers',
  EDIT_SUPPLIERS: 'edit_suppliers',
  DELETE_SUPPLIERS: 'delete_suppliers',
  VIEW_SALES: 'view_sales',
  EDIT_SALES: 'edit_sales',
  DELETE_SALES: 'delete_sales',
  VIEW_FINANCE: 'view_finance',
  EDIT_FINANCE: 'edit_finance',
  VIEW_USERS: 'view_users',
  EDIT_USERS: 'edit_users',
  // Relatórios
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  // Sistema
  SYSTEM_SETTINGS: 'system_settings',
  BACKUP_RESTORE: 'backup_restore'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.VIEW_CATEGORIES, PERMISSIONS.EDIT_CATEGORIES,
    PERMISSIONS.VIEW_SUPPLIERS, PERMISSIONS.EDIT_SUPPLIERS,
    PERMISSIONS.VIEW_SALES, PERMISSIONS.EDIT_SALES,
    PERMISSIONS.VIEW_FINANCE, PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.EDIT_PRODUCTS,
    PERMISSIONS.VIEW_SALES, PERMISSIONS.EDIT_SALES,
    PERMISSIONS.VIEW_CATEGORIES
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.VIEW_REPORTS
  ]
};

function StockManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(ROLES.VIEWER);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const [activeView, setActiveView] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [completedSales, setCompletedSales] = useState([]);
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
  const [trackingDialog, setTrackingDialog] = useState({ open: false, order: null });
  const [trackingNumber, setTrackingNumber] = useState('');
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
    conversionRate: 0,
    topProducts: [],
    salesByCategory: [],
    revenueTrend: []
  });
  const [userOrders, setUserOrders] = useState([]);
  const formRef = useRef(null);
  const [trackingLinks, setTrackingLinks] = useState({});
  const [editingTracking, setEditingTracking] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    lowStockThreshold: 5,
    currency: 'BRL',
    taxRate: 0,
    shippingCost: 0,
    automaticBackup: true,
    backupFrequency: 'daily'
  });
  const [backupStatus, setBackupStatus] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportRange, setExportRange] = useState('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restorePoint, setRestorePoint] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const AUDIT_ACTION_META = {
    CRIAR_PRODUTO: { text: 'Criação de Produto', color: 'success', icon: <Add /> },
    EDITAR_PRODUTO: { text: 'Edição de Produto', color: 'info', icon: <Edit /> },
    EXCLUIR_PRODUTO: { text: 'Exclusão de Produto', color: 'error', icon: <Delete /> },
    ATIVAR_PRODUTO: { text: 'Ativação de Produto', color: 'success', icon: <CheckCircle /> },
    DESATIVAR_PRODUTO: { text: 'Desativação de Produto', color: 'warning', icon: <Cancel /> },
    CRIAR_CATEGORIA: { text: 'Criação de Categoria', color: 'success', icon: <Add /> },
    EDITAR_CATEGORIA: { text: 'Edição de Categoria', color: 'info', icon: <Edit /> },
    EXCLUIR_CATEGORIA: { text: 'Exclusão de Categoria', color: 'error', icon: <Delete /> },
    CRIAR_FORNECEDOR: { text: 'Criação de Fornecedor', color: 'success', icon: <Add /> },
    EDITAR_FORNECEDOR: { text: 'Edição de Fornecedor', color: 'info', icon: <Edit /> },
    EXCLUIR_FORNECEDOR: { text: 'Exclusão de Fornecedor', color: 'error', icon: <Delete /> },
    MARCAR_ENVIADO: { text: 'Pedido Enviado', color: 'info', icon: <LocalShipping /> },
    DESMARCAR_ENVIADO: { text: 'Envio Desfeito', color: 'warning', icon: <Remove /> },
    CONFIRMAR_ENTREGA: { text: 'Entrega Confirmada', color: 'success', icon: <CheckCircle /> },
    CONFIRMAR_SOLICITACAO: { text: 'Solicitação Confirmada', color: 'success', icon: <CheckCircle /> },
    EXCLUIR_SOLICITACAO: { text: 'Solicitação Excluída', color: 'error', icon: <Delete /> },
    // Usuários
    PROMOVER_USUARIO: { text: 'Promoção de Usuário', color: 'secondary', icon: <TrendingUp /> },
    PROCESSAR_REEMBOLSO: { text: 'Reembolso Processado', color: 'warning', icon: <Paid /> },
    ATUALIZAR_CONFIGURACOES: { text: 'Configurações Atualizadas', color: 'info', icon: <Settings /> },
    CRIAR_BACKUP: { text: 'Backup Criado', color: 'secondary', icon: <Backup /> },
    EXPORTAR_DADOS: { text: 'Dados Exportados', color: 'secondary', icon: <Download /> },
    DEFAULT: { text: 'Ação Desconhecida', color: 'default', icon: <HelpOutline /> }
  };

  const getAuditActionMeta = (action) => {
    return AUDIT_ACTION_META[action] || { ...AUDIT_ACTION_META.DEFAULT, text: action };
  };

  const formatAuditTarget = (target) => {
    if (!target) return 'N/A';
    const parts = target.split('/');
    if (parts.length < 2) return target;
    
    const type = parts[0];
    const id = parts[1];
    
    const typeMap = {
      products: 'Produto',
      categories: 'Categoria',
      suppliers: 'Fornecedor',
      sales: 'Venda',
      users: 'Usuário',
      payments: 'Pagamento',
      system: 'Sistema'
    };

    return `${typeMap[type] || type}: ${id.slice(0, 8)}...`;
  };

  const FriendlyLogDetails = ({ log }) => {
    const { details, action } = log;

    if (!details || Object.keys(details).length === 0) {
      return <Typography sx={{ p: 2, fontStyle: 'italic' }}>Nenhum detalhe adicional disponível.</Typography>;
    }

    const renderKeyValue = (key, value) => (
      <Box key={key} sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: { xs: 100, sm: 150 } }}>{key}:</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{String(value)}</Typography>
      </Box>
    );

    switch (action) {
      case 'EXCLUIR_PRODUTO':
      case 'EXCLUIR_CATEGORIA':
      case 'EXCLUIR_FORNECEDOR':
        return (
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography>O item a seguir foi permanentemente excluído: <strong>{details.productName || details.categoryName || details.supplierName}</strong> (ID: {details.productId || details.categoryId || details.supplierId})</Typography>
          </Alert>
        );
      default:
        return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(details, null, 2)}</pre>;
    }
  };

  const [auditLogPage, setAuditLogPage] = useState(1);
  const [lastVisibleAuditLog, setLastVisibleAuditLog] = useState(null);
  const [firstVisibleAuditLog, setFirstVisibleAuditLog] = useState(null);
  const [isLastAuditLogPage, setIsLastAuditLogPage] = useState(false);
  const [logDetailsOpen, setLogDetailsOpen] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState(null);
  const AUDIT_LOGS_PER_PAGE = 20;

  const hasPermission = (permission) => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || ROLES.VIEWER);
            setUserPermissions(ROLE_PERMISSIONS[userData.role] || []);
          }
        } catch (error) {
          console.error("Erro ao carregar permissões:", error);
        }
      } else {
        setCurrentUser(null);
        setUserRole(ROLES.VIEWER);
        setUserPermissions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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

    return true;
  };
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

  const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
  
  const uniqueSubcategories = filters.category 
    ? [...new Set(
        products
          .filter(p => p.category === filters.category)
          .map(p => p.subcategory)
      )].filter(Boolean)
    : [];

  const toggleProductStatus = async (productId, currentStatus) => {
    if (!hasPermission(PERMISSIONS.EDIT_PRODUCTS)) {
      alert("Você não tem permissão para editar produtos");
      return;
    }

    try {
      const totalStock = products.find(p => p.id === productId)?.variations
        .reduce((acc, curr) => acc + (curr.stock || 0), 0) || 0;
      
      if (!currentStatus && totalStock <= 0) {
        alert("Não é possível ativar um produto sem estoque!");
        return;
      }

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
      
      await addDoc(collection(db, "auditLogs"), {
        action: currentStatus ? "DESATIVAR_PRODUTO" : "ATIVAR_PRODUTO",
        target: `products/${productId}`,
        user: userInfo,
        timestamp: new Date(),
        details: {
          productId: productId,
          previousStatus: currentStatus,
          newStatus: !currentStatus
        }
      });

      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, enabled: !currentStatus } : p
        )
      );

      addNotification(
        currentStatus ? "Produto desativado" : "Produto ativado",
        `O produto foi ${currentStatus ? "desativado" : "ativado"} com sucesso.`,
        currentStatus ? "warning" : "success"
      );
    } catch (error) {
      console.error("Error toggling product status:", error);
      addNotification("Erro", "Não foi possível alterar o status do produto.", "error");
    }
  };

  const addNotification = (title, message, severity = "info") => {
    const newNotification = {
      id: Date.now(),
      title,
      message,
      severity,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Limitar a 50 notificações
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

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
        await addDoc(collection(db, "auditLogs"), {
          action: "PROCESSAR_REEMBOLSO",
          target: `payments/${paymentId}`,
          user: {
            uid: currentUser?.uid || '',
            name: currentUser?.displayName || currentUser?.email || '',
            email: currentUser?.email || '',
          },
          timestamp: new Date(),
          details: {
            paymentId: paymentId,
            reason: reason
          }
        });

        addNotification("Reembolso processado", "O reembolso foi processado com sucesso.", "success");
      } else {
        alert('Erro ao processar reembolso');
        addNotification("Erro no reembolso", "Não foi possível processar o reembolso.", "error");
      }
    } catch (error) {
      console.error('Erro no reembolso:', error);
      addNotification("Erro no reembolso", "Ocorreu um erro ao processar o reembolso.", "error");
    }
  };

 const fetchPayments = async () => {
  if (!hasPermission(PERMISSIONS.VIEW_FINANCE)) return;

  try {
    const paymentsCollection = collection(db, "payments");
    const querySnapshot = await getDocs(paymentsCollection);
    
    let paymentsData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      let createdAtDate;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        // Se for um Timestamp do Firestore
        createdAtDate = data.createdAt.toDate();
      } else if (data.createdAt && data.createdAt.seconds) {
        // Se for um objeto Timestamp {seconds, nanoseconds}
        createdAtDate = new Date(data.createdAt.seconds * 1000);
      } else if (data.createdAt) {
        // Se já for uma Date ou string
        createdAtDate = new Date(data.createdAt);
      } else {
        // Fallback para data atual
        createdAtDate = new Date();
      }
      
      return {
        id: doc.id,
        paymentId: doc.id,
        ...data,
        createdAt: createdAtDate
      };
    });

    paymentsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setPayments(paymentsData);
    console.log('DEBUG: Pagamentos carregados:', paymentsData);

  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    addNotification("Erro", "Não foi possível carregar os dados de pagamentos.", "error");
  }
};

  const fetchFinancialData = async () => {
    if (!hasPermission(PERMISSIONS.VIEW_FINANCE)) return;
    
    try {
      const completedSalesData = allSales.filter(s => 
        ['enviado', 'entregue', 'shipped', 'delivered'].includes(s.status?.toLowerCase())
      );
      setCompletedSales(completedSalesData);

      const dailyRevenue = completedSalesData
        .filter(p => {
          const saleDate = p.createdAt; // Já é um objeto Date
          const today = new Date();
          return saleDate.toDateString() === today.toDateString();
        })
        .reduce((acc, curr) => acc + (curr.total || 0), 0);

      const monthlyRevenue = completedSalesData
        .filter(p => {
          const saleDate = p.createdAt;
          const today = new Date();
          return saleDate.getMonth() === today.getMonth() && 
                 saleDate.getFullYear() === today.getFullYear();
        })
        .reduce((acc, curr) => acc + (curr.total || 0), 0);

      const averageTicket = completedSalesData.length > 0 
        ? completedSalesData.reduce((acc, curr) => acc + (curr.total || 0), 0) / completedSalesData.length 
        : 0;

      const conversionRate = allSales.length > 0 
        ? (completedSalesData.length / allSales.length) * 100 
        : 0;

      const revenueTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');

        const dailyRevenueForTrend = completedSalesData
          .filter(s => {
            const saleDate = s.createdAt;
            return format(saleDate, 'yyyy-MM-dd') === dateStr;
          })
          .reduce((acc, curr) => acc + (curr.total || 0), 0);

        revenueTrend.push({
          date: format(date, 'dd/MM'),
          revenue: dailyRevenueForTrend
        });
      }

      const productSales = {};
      completedSalesData.forEach(sale => {
        (sale.items || []).forEach(item => {
          if (!productSales[item.name]) {
            productSales[item.name] = { name: item.name, quantity: 0, revenue: 0 };
          }
          productSales[item.name].quantity += item.quantity || 0;
          productSales[item.name].revenue += (item.quantity || 0) * (item.price || 0);
        });
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const categorySales = {};
      completedSalesData.forEach(sale => {
        (sale.items || []).forEach(item => {
          const category = products.find(p => p.id === item.productId)?.category || 'Outros';
          if (!categorySales[category]) {
            categorySales[category] = { name: category, value: 0 };
          }
          categorySales[category].value += (item.quantity || 0) * (item.price || 0);
        });
      });
      const salesByCategory = Object.values(categorySales);

      setFinancialData({
        dailyRevenue,
        monthlyRevenue,
        averageTicket,
        conversionRate,
        topProducts,
        salesByCategory,
        revenueTrend
      });
    } catch (error) {
      console.error('Erro ao calcular dados financeiros:', error);
      setFinancialData({
        dailyRevenue: 0,
        monthlyRevenue: 0,
        averageTicket: 0,
        conversionRate: 0,
        topProducts: [],
        salesByCategory: [],
        revenueTrend: []
      });
    }
  };

  const fetchUserOrders = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const salesQuery = query(
          collection(db, "sales"),
          where("userId", "==", currentUser.uid)
        );
        const salesSnapshot = await getDocs(salesQuery);

        // Mapear e ordenar os pedidos
        const allOrders = salesSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            type: 'sale',
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt || new Date())
          }))
        .sort((a, b) => {
          const dateA = a.createdAt?.getTime?.() || new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.getTime?.() || new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Ordenar do mais recente para o mais antigo
        });

        setUserOrders(allOrders);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      
      try {
        const allSales = await getDocs(collection(db, "sales"));
        
        const auth = getAuth();
        const fallbackOrders = allSales.docs
          .filter(doc => doc.data().userId === auth.currentUser.uid)
          .map(doc => ({ id: doc.id, ...doc.data(), type: 'sale' }))
          .sort((a, b) => {
            const dateA = a.createdAt?.getTime?.() || new Date(a.createdAt || 0).getTime();
            const dateB = b.createdAt?.getTime?.() || new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        
        setUserOrders(fallbackOrders);
      } catch (fallbackError) {
        console.error('Fallback também falhou:', fallbackError);
      }
    }
  };

  const fetchAuditLogs = async (direction = 'first') => {
    if (!hasPermission(PERMISSIONS.SYSTEM_SETTINGS)) return;
    setLoading(true);
    try {
      const logsCollection = collection(db, "auditLogs");
      let q;

      if (direction === 'next' && lastVisibleAuditLog) {
        q = query(logsCollection, orderBy("timestamp", "desc"), startAfter(lastVisibleAuditLog), limit(AUDIT_LOGS_PER_PAGE));
      } else { // 'first' or 'prev' (simplificado para refetch)
        q = query(logsCollection, orderBy("timestamp", "desc"), limit(AUDIT_LOGS_PER_PAGE));
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp || new Date())
        }));

        setAuditLogs(logsData);
        setFirstVisibleAuditLog(snapshot.docs[0]);
        setLastVisibleAuditLog(snapshot.docs[snapshot.docs.length - 1]);

        if (direction === 'first') setAuditLogPage(1);
        if (direction === 'next') setAuditLogPage(p => p + 1);

        const nextCheckQuery = query(logsCollection, orderBy("timestamp", "desc"), startAfter(snapshot.docs[snapshot.docs.length - 1]), limit(1));
        const nextCheckSnapshot = await getDocs(nextCheckQuery);
        setIsLastAuditLogPage(nextCheckSnapshot.empty);
      } else {
        if (direction === 'next') setIsLastAuditLogPage(true);
        if (direction === 'first') setAuditLogs([]);
      }
    } catch (error) {
      console.error("Erro ao buscar logs de auditoria:", error);
      addNotification("Erro", "Não foi possível carregar os logs de auditoria.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogDetails = (log) => {
    setSelectedLogDetails(log);
    setLogDetailsOpen(true);
  };

  const validateCategoryForm = () => {
    const errors = {};
    if (!newCategory.name.trim()) {
      errors.categoryName = "Nome da categoria é obrigatório";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCloseLogDetails = () => {
    setLogDetailsOpen(false);
    setSelectedLogDetails(null);
  };

  const fetchSystemSettings = async () => {
    if (!hasPermission(PERMISSIONS.SYSTEM_SETTINGS)) return;
    
    try {
      const docRef = doc(db, "system", "settings");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSystemSettings(docSnap.data());
      }
    } catch (error) {
      console.error("Erro ao buscar configurações do sistema:", error);
    }
  };

  const saveSystemSettings = async () => {
    if (!hasPermission(PERMISSIONS.SYSTEM_SETTINGS)) {
      alert("Você não tem permissão para alterar configurações do sistema");
      return;
    }
    
    try {
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      await updateDoc(doc(db, "system", "settings"), {
        ...systemSettings,
        updatedBy: userInfo,
        updatedAt: new Date(),
      });

      await addDoc(collection(db, "auditLogs"), {
        action: "ATUALIZAR_CONFIGURACOES",
        target: "system/settings",
        user: userInfo,
        timestamp: new Date(),
        details: systemSettings
      });

      addNotification("Configurações salvas", "As configurações do sistema foram atualizadas com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      addNotification("Erro", "Não foi possível salvar as configurações do sistema.", "error");
    }
  };

  const createBackup = async () => {
    if (!hasPermission(PERMISSIONS.BACKUP_RESTORE)) {
      alert("Você não tem permissão para criar backups");
      return;
    }
    
    try {
      setBackupStatus({ inProgress: true, message: "Criando backup..." });
      
      const collections = ['products', 'categories', 'suppliers', 'sales', 'users'];
      const backupData = {};
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        backupData[collectionName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const backupMetadata = {
        timestamp: new Date(),
        createdBy: {
          uid: currentUser?.uid || '',
          name: currentUser?.displayName || currentUser?.email || '',
          email: currentUser?.email || '',
        },
        collections: collections,
        itemCount: Object.values(backupData).reduce((acc, curr) => acc + curr.length, 0)
      };
      
      const backupRef = await addDoc(collection(db, "backups"), {
        ...backupMetadata,
        data: backupData
      });
      
      setBackupStatus({ 
        inProgress: false, 
        message: "Backup criado com sucesso!", 
        success: true,
        backupId: backupRef.id 
      });
      
      await addDoc(collection(db, "auditLogs"), {
        action: "CRIAR_BACKUP",
        target: `backups/${backupRef.id}`,
        user: backupMetadata.createdBy,
        timestamp: new Date(),
        details: backupMetadata
      });

      addNotification("Backup criado", "O backup dos dados foi criado com sucesso.", "success");
      
      setTimeout(() => {
        setBackupStatus({});
      }, 5000);
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      setBackupStatus({ 
        inProgress: false, 
        message: "Erro ao criar backup", 
        success: false 
      });
      addNotification("Erro no backup", "Não foi possível criar o backup dos dados.", "error");
    }
  };

  const exportData = async (format, range) => {
    if (!hasPermission(PERMISSIONS.EXPORT_DATA)) {
      alert("Você não tem permissão para exportar dados");
      return;
    }
    
    try {
      let dataToExport = [];
      let fileName = '';
      
      let startDate, endDate;
      const now = new Date();
      
      switch (range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = null;
          endDate = null;
      }
      
      if (activeView === 'reports' && startDate && endDate) {
        dataToExport = sales.filter(sale => {
          const saleDate = sale.createdAt?.toDate?.() || new Date(sale.createdAt || new Date());
          return isWithinInterval(saleDate, { start: startDate, end: endDate });
        });
        fileName = `vendas_${format(now, 'yyyy-MM-dd')}`;
      } else if (activeView === 'productList') {
        dataToExport = filteredProducts;
        fileName = `produtos_${format(now, 'yyyy-MM-dd')}`;
      }
      
      let output;
      let mimeType;
      
      if (format === 'csv') {
        output = convertToCSV(dataToExport);
        mimeType = 'text/csv';
        fileName += '.csv';
      } else if (format === 'json') {
        output = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        fileName += '.json';
      }
      
      const blob = new Blob([output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await addDoc(collection(db, "auditLogs"), {
        action: "EXPORTAR_DADOS",
        target: activeView,
        user: {
          uid: currentUser?.uid || '',
          name: currentUser?.displayName || currentUser?.email || '',
          email: currentUser?.email || '',
        },
        timestamp: new Date(),
        details: {
          format: format,
          range: range,
          itemCount: dataToExport.length
        }
      });

      addNotification("Exportação concluída", "Os dados foram exportados com sucesso.", "success");
      setExportDialogOpen(false);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      addNotification("Erro na exportação", "Não foi possível exportar os dados.", "error");
    }
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  };

  const validateProductForm = () => {
    const errors = {};
    
    if (!newProduct.name.trim()) {
      errors.name = "Nome do produto é obrigatório";
    }
    
    if (!newProduct.sku.trim()) {
      errors.sku = "SKU é obrigatório";
    }
    
    if (!newProduct.category) {
      errors.category = "Categoria é obrigatória";
    }
    
    if (newProduct.costPrice && parseFloat(newProduct.costPrice) < 0) {
      errors.costPrice = "Preço de custo não pode ser negativo";
    }
    
    if (!newProduct.salePrice || parseFloat(newProduct.salePrice) <= 0) {
      errors.salePrice = "Preço de venda deve ser maior que zero";
    }
    
    if (newProduct.discount && (parseFloat(newProduct.discount) < 0 || parseFloat(newProduct.discount) > 100)) {
      errors.discount = "Desconto deve estar entre 0 e 100%";
    }
    
    newProduct.variations.forEach((variation, index) => {
      if (variation.stock && parseInt(variation.stock) < 0) {
        errors[`variation-${index}-stock`] = "Estoque não pode ser negativo";
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (!currentUser) return;
    
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
        
        const lowStockProducts = productsData.filter(product => {
          const totalStock = product.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
          return totalStock > 0 && totalStock <= systemSettings.lowStockThreshold;
        });
        
        if (lowStockProducts.length > 0 && hasPermission(PERMISSIONS.VIEW_PRODUCTS)) {
          addNotification(
            "Estoque Baixo", 
            `${lowStockProducts.length} produto(s) com estoque baixo.`, 
            "warning"
          );
        }
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
          createdAt: doc.data().createdAt?.toDate 
            ? doc.data().createdAt.toDate() 
            : new Date(doc.data().createdAt || new Date()),
          date: doc.data().date?.toDate 
            ? doc.data().date.toDate() 
            : new Date(doc.data().date || new Date())
        }));
        setAllSales(salesData);

        setSales(salesData.filter((sale) => 
          sale.status === "Pendente" || sale.status === "pending"
        ));
        
        setRequestedSales(salesData.filter((sale) => 
          sale.status === "Solicitada" || sale.status === "requested"
        ));
        
        setDeliveredSales(salesData.filter((sale) => 
          sale.status === "Entregue" || sale.status === "delivered"
        ));
        
        const totalSalesValue = salesData.reduce((acc, sale) => {
          return acc + (sale.total || 0);
        }, 0);
        setTotalSales(totalSalesValue);
        
        if (salesData.some(sale => 
          (sale.status === "Pendente" || sale.status === "pending") && 
          sale.createdAt > subDays(new Date(), 1)
        ) && hasPermission(PERMISSIONS.VIEW_SALES)) {
          addNotification(
            "Novas Vendas", 
            "Há novas vendas pendentes de processamento.", 
            "info"
          );
        }
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
    
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      }
    );
    
    if (hasPermission(PERMISSIONS.SYSTEM_SETTINGS)) {
      fetchAuditLogs('first');
    }
    fetchSystemSettings();    
    fetchUserOrders();

    return () => {
      unsubscribeProducts();
      if (unsubscribeSales) unsubscribeSales();
      unsubscribeSuppliers();
      unsubscribeCategories();
      unsubscribeUsers();
    };
  }, [currentUser, systemSettings.lowStockThreshold]);

  useEffect(() => {
    if (hasPermission(PERMISSIONS.VIEW_FINANCE) && allSales.length > 0 && products.length > 0) {
      fetchFinancialData();
    }
  }, [allSales, products, hasPermission(PERMISSIONS.VIEW_FINANCE)]);

  // Funções de gerenciamento de usuários
  const makeAdmin = async (userId) => {
    if (!hasPermission(PERMISSIONS.EDIT_USERS)) {
      addNotification("Permissão negada", "Você não tem permissão para editar usuários.", "error");
      return;
    }
    
    try {
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
      
      await addDoc(collection(db, "auditLogs"), {
        action: "PROMOVER_USUARIO",
        target: `users/${userId}`,
        user: userInfo,
        timestamp: new Date(),
        details: {
          userId: userId,
          newRole: "admin"
        }
      });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: "admin" } : user
        )
      );
      
      addNotification("Usuário promovido", "O usuário foi promovido a administrador com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao promover usuário:", error);
      addNotification("Erro", "Não foi possível promover o usuário.", "error");
    }
  };

  const updateTrackingNumber = async (orderId, trackingNumber) => {
    if (!hasPermission(PERMISSIONS.EDIT_SALES)) {
      addNotification("Permissão negada", "Você não tem permissão para editar pedidos.", "error");
      return;
    }
    if (!orderId || !trackingNumber) {
      addNotification("Dados inválidos", "ID do pedido ou código de rastreio ausente.", "warning");
      return;
    }
  
    try {
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };
  
      await updateDoc(doc(db, "sales", orderId), {
        trackingNumber: trackingNumber,
        status: 'enviado', // Atualiza o status para 'enviado'
        updatedBy: userInfo,
        updatedAt: new Date(),
      });
  
      setUserOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, trackingNumber, status: 'enviado' } : order
      ));
  
      setTrackingDialog({ open: false, order: null });
      setTrackingNumber('');
      addNotification('Sucesso', 'Código de rastreamento atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar rastreamento:', error);
      addNotification('Erro', 'Não foi possível atualizar o código de rastreamento.', 'error');
    }
  };

  const getProductsBySubcategory = (categoryName, subcategoryName) => {
    return products.filter(
      (product) =>
        product.category === categoryName &&
        product.subcategory === subcategoryName
    );
  };

  const deleteCategory = async (id) => {
    if (!hasPermission(PERMISSIONS.DELETE_CATEGORIES)) {
      alert("Você não tem permissão para excluir categorias");
      return;
    }
    
    try {
      const productsInCategory = products.filter(p => p.category === categories.find(c => c.id === id)?.name);
      
      if (productsInCategory.length > 0) {
        alert("Não é possível excluir esta categoria pois existem produtos associados a ela.");
        return;
      }
      
      await deleteDoc(doc(db, "categories", id));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "EXCLUIR_CATEGORIA",
        target: `categories/${id}`,
        user: {
          uid: currentUser?.uid || '',
          name: currentUser?.displayName || currentUser?.email || '',
          email: currentUser?.email || '',
        },
        timestamp: new Date()
      });

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      addNotification("Categoria excluída", "A categoria foi excluída com sucesso.", "success");
    } catch (error) {
      console.error("Error deleting category:", error);
      addNotification("Erro", "Não foi possível excluir a categoria.", "error");
    }
  };

  const saveCategory = async () => {
    if (!hasPermission(PERMISSIONS.EDIT_CATEGORIES)) {
      alert("Você não tem permissão para editar categorias");
      return;
    }
    
    try {
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      const categoryData = {
        name: newCategory.name,
        subcategories: newCategory.subcategories.filter(sc => sc.trim() !== ''),
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
        
        await addDoc(collection(db, "auditLogs"), {
          action: "EDITAR_CATEGORIA",
          target: `categories/${editingCategory.id}`,
          user: userInfo,
          timestamp: new Date(),
          details: categoryData
        });

        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === editingCategory.id
              ? { ...categoryData, id: editingCategory.id }
              : cat
          )
        );
        
        addNotification("Categoria atualizada", "A categoria foi atualizada com sucesso.", "success");
      } else {
        const docRef = await addDoc(collection(db, "categories"), categoryData);
        
        await addDoc(collection(db, "auditLogs"), {
          action: "CRIAR_CATEGORIA",
          target: `categories/${docRef.id}`,
          user: userInfo,
          timestamp: new Date(),
          details: categoryData
        });

        setCategories((prev) => [...prev, { ...categoryData, id: docRef.id }]);
        addNotification("Categoria criada", "A categoria foi criada com sucesso.", "success");
      }

      resetCategoryForm();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      addNotification("Erro", "Não foi possível salvar a categoria.", "error");
    }
  };

  const resetCategoryForm = () => {
    setNewCategory({
      name: "",
      subcategories: [],
    });
    setEditingCategory(null);
    setValidationErrors({});
  };

  const startEditingCategory = (category) => {
    if (!hasPermission(PERMISSIONS.EDIT_CATEGORIES)) {
      alert("Você não tem permissão para editar categorias");
      return;
    }
    
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
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
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

  const removeVariation = (index) => {
    if (newProduct.variations.length <= 1) {
      alert("O produto deve ter pelo menos uma variação.");
      return;
    }
    
    setNewProduct((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
  };

  const handleVariationChange = (index, field, value) => {
    const updatedVariations = [...newProduct.variations];
    updatedVariations[index][field] = value;
    setNewProduct((prev) => ({ ...prev, variations: updatedVariations }));
    
    const errorKey = `variation-${index}-${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const saveProduct = async () => {
    if (!hasPermission(PERMISSIONS.EDIT_PRODUCTS)) {
      alert("Você não tem permissão para editar produtos");
      return;
    }
    
    if (!validateProductForm()) {
      addNotification("Erro de validação", "Verifique os campos destacados em vermelho.", "error");
      return;
    }
    
    try {
      const userInfo = {
        uid: currentUser?.uid || '',
        name: currentUser?.displayName || currentUser?.email || '',
        email: currentUser?.email || '',
      };

      const totalStock = newProduct.variations.reduce(
        (acc, curr) => acc + (parseInt(curr.stock) || 0),
        0
      );

      const inputSalePrice = parseFloat(newProduct.salePrice) || 0;
      const discountPercentage = parseFloat(newProduct.discount) || 0;

      const originalSalePrice = newProduct.oldPrice && newProduct.oldPrice > 0 ? newProduct.oldPrice : inputSalePrice;

      const finalSalePrice =
        discountPercentage > 0
          ? originalSalePrice * (1 - discountPercentage / 100)
          : originalSalePrice;


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
        oldPrice: originalSalePrice, // Salva o preço original
        salePrice: finalSalePrice, // Salva o preço com desconto
        discount: discountPercentage,
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
        
        await addDoc(collection(db, "auditLogs"), {
          action: "EDITAR_PRODUTO",
          target: `products/${editingProduct.id}`,
          user: userInfo,
          timestamp: new Date(),
          details: productData
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...productData, id: editingProduct.id }
              : p
          )
        );
        setEditSuccess(true);
        setExpandedProductForm(true);
        addNotification("Produto atualizado", "O produto foi atualizado com sucesso.", "success");
      } else {
        const docRef = await addDoc(collection(db, "products"), productData);
        
        await addDoc(collection(db, "auditLogs"), {
          action: "CRIAR_PRODUTO",
          target: `products/${docRef.id}`,
          user: userInfo,
          timestamp: new Date(),
          details: productData
        });

        setProducts((prev) => [...prev, { ...productData, id: docRef.id }]);
        resetForm();
        setExpandedProductForm(false);
        addNotification("Produto criado", "O produto foi criado com sucesso.", "success");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      addNotification("Erro", "Não foi possível salvar o produto.", "error");
    }
  };

  const deleteProduct = async (id) => {
    if (!hasPermission(PERMISSIONS.DELETE_PRODUCTS)) {
      alert("Você não tem permissão para excluir produtos");
      return;
    }
    
    if (!window.confirm("Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "products", id));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "EXCLUIR_PRODUTO",
        target: `products/${id}`,
        user: {
          uid: currentUser?.uid || '',
          name: currentUser?.displayName || currentUser?.email || '',
          email: currentUser?.email || '',
        },
        timestamp: new Date(),
        details: {
          productName: productToDelete?.name || 'Nome não encontrado',
          productId: id
        }
      });

      setProducts((prev) => prev.filter((p) => p.id !== id));
      addNotification("Produto excluído", "O produto foi excluído com sucesso.", "success");
    } catch (error) {
      console.error("Error deleting product:", error);
      addNotification("Erro", "Não foi possível excluir o produto.", "error");
    }
  };

  const startEditing = (product) => {
    if (!hasPermission(PERMISSIONS.EDIT_PRODUCTS)) {
      alert("Você não tem permissão para editar produtos");
      return;
    }
    
    setActiveView("products");
    setEditingProduct(product);
    setNewProduct({
      ...product,
      salePrice: product.oldPrice || product.salePrice, // Preenche o campo com o preço original
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
    if (!hasPermission(PERMISSIONS.EDIT_SUPPLIERS)) {
      alert("Você não tem permissão para editar fornecedores");
      return;
    }
    
    try {
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
        
        await addDoc(collection(db, "auditLogs"), {
          action: "EDITAR_FORNECEDOR",
          target: `suppliers/${editingSupplier.id}`,
          user: userInfo,
          timestamp: new Date(),
          details: supplierData
        });

        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === editingSupplier.id
              ? { ...supplierData, id: editingSupplier.id }
              : s
          )
        );
        addNotification("Fornecedor atualizado", "O fornecedor foi atualizado com sucesso.", "success");
      } else {
        const docRef = await addDoc(collection(db, "suppliers"), supplierData);
        
        await addDoc(collection(db, "auditLogs"), {
          action: "CRIAR_FORNECEDOR",
          target: `suppliers/${docRef.id}`,
          user: userInfo,
          timestamp: new Date(),
          details: supplierData
        });

        setSuppliers((prev) => [...prev, { ...supplierData, id: docRef.id }]);
        addNotification("Fornecedor criado", "O fornecedor foi criado com sucesso.", "success");
      }
      resetSupplierForm();
    } catch (error) {
      console.error("Error saving supplier:", error);
      addNotification("Erro", "Não foi possível salvar o fornecedor.", "error");
    }
  };

  const deleteSupplier = async (id) => {
    if (!hasPermission(PERMISSIONS.DELETE_SUPPLIERS)) {
      alert("Você não tem permissão para excluir fornecedores");
      return;
    }
    
    const productsWithSupplier = products.filter(p => p.supplierId === id);
    
    if (productsWithSupplier.length > 0) {
      alert("Não é possível excluir este fornecedor pois existem produtos associados a ele.");
      return;
    }
    
    if (!window.confirm("Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "suppliers", id));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "EXCLUIR_FORNECEDOR",
        target: `suppliers/${id}`,
        user: {
          uid: currentUser?.uid || '',
          name: currentUser?.displayName || currentUser?.email || '',
          email: currentUser?.email || '',
        },
        timestamp: new Date(),
        details: {
          supplierName: supplierToDelete?.name || 'Nome não encontrado',
          supplierId: id
        }
      });

      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      addNotification("Fornecedor excluído", "O fornecedor foi excluído com sucesso.", "success");
    } catch (error) {
      console.error("Error deleting supplier:", error);
      addNotification("Erro", "Não foi possível excluir o fornecedor.", "error");
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
    setValidationErrors({});
  };

  const startEditingSupplier = (supplier) => {
    if (!hasPermission(PERMISSIONS.EDIT_SUPPLIERS)) {
      alert("Você não tem permissão para editar fornecedores");
      return;
    }
    
    setEditingSupplier(supplier);
    setNewSupplier(supplier);
  };

  const markAsShipped = async (saleId) => {
    if (!hasPermission(PERMISSIONS.EDIT_SALES)) {
      alert("Você não tem permissão para editar vendas");
      return;
    }
    
    try {
      const paymentStatus = await checkPaymentStatus(saleId);
      
      if (paymentStatus !== 'approved') {
        alert('Não é possível enviar pedido com pagamento não aprovado');
        return;
      }

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
      
      await addDoc(collection(db, "auditLogs"), {
        action: "MARCAR_ENVIADO",
        target: `sales/${saleId}`,
        user: userInfo,
        timestamp: new Date()
      });

      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, shipped: true, status: "Enviado" } : sale
        )
      );
      addNotification("Pedido enviado", "O pedido foi marcado como enviado.", "success");
    } catch (error) {
      console.error("Error updating order:", error);
      addNotification("Erro", "Não foi possível marcar o pedido como enviado.", "error");
    }
  };

  const unmarkAsShipped = async (saleId) => {
    if (!hasPermission(PERMISSIONS.EDIT_SALES)) {
      alert("Você não tem permissão para editar vendas");
      return;
    }
    
    try {
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
      
      await addDoc(collection(db, "auditLogs"), {
        action: "DESMARCAR_ENVIADO",
        target: `sales/${saleId}`,
        user: userInfo,
        timestamp: new Date()
      });

      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, shipped: false, status: "Pendente" } : sale
        )
      );
      addNotification("Status alterado", "O pedido foi marcado como pendente novamente.", "info");
    } catch (error) {
      console.error("Erro ao desmarcar como enviado:", error);
      addNotification("Erro", "Não foi possível alterar o status do pedido.", "error");
    }
  };

  const confirmDelivery = async (saleId) => {
    if (!hasPermission(PERMISSIONS.EDIT_SALES)) {
      addNotification("Permissão negada", "Você não tem permissão para editar vendas.", "error");
      return;
    }
    
    try {
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
      
      await addDoc(collection(db, "auditLogs"), {
        action: "CONFIRMAR_ENTREGA",
        target: `sales/${saleId}`,
        user: userInfo,
        timestamp: new Date()
      });

      setSales((prev) =>
        prev.map((sale) =>
          sale.id === saleId ? { ...sale, status: "Entregue" } : sale
        )
      );
      addNotification("Entrega confirmada", "A entrega do pedido foi confirmada.", "success");
    } catch (error) {
      console.error("Erro ao confirmar entrega:", error);
      addNotification("Erro", "Não foi possível confirmar a entrega do pedido.", "error");
    }
  };

  const confirmRequestedSale = async (saleId) => {
    if (!hasPermission(PERMISSIONS.EDIT_SALES)) {
      alert("Você não tem permissão para editar vendas");
      return;
    }
    
    try {
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
      
      await addDoc(collection(db, "auditLogs"), {
        action: "CONFIRMAR_SOLICITACAO",
        target: `sales/${saleId}`,
        user: userInfo,
        timestamp: new Date()
      });

      addNotification("Solicitação confirmada", "A solicitação de compra foi confirmada.", "success");
    } catch (error) {
      console.error("Erro ao confirmar solicitação:", error);
      addNotification("Erro", "Não foi possível confirmar a solicitação de compra.", "error");
    }
  };

  const deleteRequestedSale = async (saleId) => {
    if (!hasPermission(PERMISSIONS.DELETE_SALES)) {
      alert("Você não tem permissão para excluir vendas");
      return;
    }
    
    if (!window.confirm("Tem certeza que deseja excluir esta solicitação de compra? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "sales", saleId));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "EXCLUIR_SOLICITACAO",
        target: `sales/${saleId}`,
        user: {
          uid: currentUser?.uid || '',
          name: currentUser?.displayName || currentUser?.email || '',
          email: currentUser?.email || '',
        },
        timestamp: new Date()
      });

      setRequestedSales((prev) => prev.filter((sale) => sale.id !== saleId));
      addNotification("Solicitação excluída", "A solicitação de compra foi excluída.", "success");
    } catch (error) {
      console.error("Erro ao excluir compra solicitada:", error);
      addNotification("Erro", "Não foi possível excluir a solicitação de compra.", "error");
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
    setValidationErrors({});
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
  }, [newProduct.variations]);

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

const Dashboard = () => {
  return (
    <Box sx={{ 
      width: '100%', 
      p: { xs: 1, sm: 2, md: 3 }, 
      overflowX: 'auto',
      boxSizing: 'border-box'
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', md: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Typography variant="h4" fontWeight="700" sx={{ 
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
          textAlign: { xs: 'center', md: 'left' }
        }}>
          Dashboard
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          justifyContent: { xs: 'center', md: 'flex-end' },
          flexWrap: 'wrap'
        }}>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<Refresh />}
            onClick={() => {
              fetchFinancialData();
              fetchPayments();
            }}
          >
            Atualizar
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<BarChart />}
            onClick={() => setActiveView('reports')}
          >
            Relatórios
          </Button>
        </Box>
      </Box>

      <Box sx={{ 
        width: '100%',
        overflowX: 'auto',
        mb: 3,
        pb: 1,
        '&::-webkit-scrollbar': {
          height: 6,
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: 3,
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#ccc',
          borderRadius: 3,
        },
      }}>
        <Box sx={{ 
          display: 'flex',
          width: 'max-content',
          gap: 2,
          flexDirection: { xs: 'row', sm: 'unset' },
        }}>
          <Box sx={{ minWidth: 250 }}>
            <MetricCard
              title="Vendas Hoje"
              value={`R$ ${financialData.dailyRevenue.toFixed(2)}`}
              icon={<Today />}
              color="success"
              trend={financialData.dailyRevenue > 0 ? "up" : "neutral"}
            />
          </Box>
          <Box sx={{ minWidth: 250 }}>
            <MetricCard
              title="Vendas do Mês"
              value={`R$ ${financialData.monthlyRevenue.toFixed(2)}`}
              icon={<TrendingUp />}
              color="info"
              trend="up"
            />
          </Box>
          <Box sx={{ minWidth: 250 }}>
            <MetricCard
              title="Ticket Médio"
              value={`R$ ${financialData.averageTicket.toFixed(2)}`}
              icon={<Paid />}
              color="primary"
              trend="up"
            />
          </Box>
          <Box sx={{ minWidth: 250 }}>
            <MetricCard
              title="Taxa de Conversão"
              value={`${financialData.conversionRate.toFixed(1)}%`}
              icon={<CheckCircle />}
              color="warning"
              trend="up"
            />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Receita dos Últimos 7 Dias
              </Typography>
              <Box sx={{ flex: 1, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Vendas por Categoria
              </Typography>
              <Box sx={{ flex: 1, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financialData.salesByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {financialData.salesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} xl={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Produtos Mais Vendidos
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="right">Receita</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialData.topProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar 
                              src={products.find(p => p.name === product.name)?.imageUrls?.[0]} 
                              sx={{ width: 40, height: 40 }}
                              variant="rounded"
                            />
                            <Box>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {product.name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{product.quantity}</TableCell>
                        <TableCell align="right">R$ {product.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alertas do Sistema
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {products.filter(p => {
                  const totalStock = p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                  return totalStock > 0 && totalStock <= systemSettings.lowStockThreshold;
                }).length > 0 && (
                  <Alert severity="warning">
                    {products.filter(p => {
                      const totalStock = p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                      return totalStock > 0 && totalStock <= systemSettings.lowStockThreshold;
                    }).length} produto(s) com estoque baixo.
                  </Alert>
                )}
                
                {products.filter(p => {
                  const totalStock = p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                  return totalStock <= 0;
                }).length > 0 && (
                  <Alert severity="error">
                    {products.filter(p => {
                      const totalStock = p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                      return totalStock <= 0;
                    }).length} produto(s) sem estoque.
                  </Alert>
                )}
                
                {sales.filter(s => s.status === "Pendente" || s.status === "pending").length > 0 && (
                  <Alert severity="info">
                    {sales.filter(s => s.status === "Pendente" || s.status === "pending").length} venda(s) pendente(s) de processamento.
                  </Alert>
                )}

                {products.filter(p => {
                  const totalStock = p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                  return totalStock > 0 && totalStock <= systemSettings.lowStockThreshold;
                }).length === 0 && 
                products.filter(p => {
                  const totalStock = p.variations.reduce((acc, curr) => acc + (curr.stock || 0), 0);
                  return totalStock <= 0;
                }).length === 0 && 
                sales.filter(s => s.status === "Pendente" || s.status === "pending").length === 0 && (
                  <Alert severity="success">
                    Todos os sistemas operando normalmente.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const MetricCard = ({ title, value, icon, color = "primary", trend = "neutral" }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden'
    }}>
      <CardContent sx={{ 
        display: "flex", 
        alignItems: "flex-start", 
        justifyContent: "space-between",
        gap: 2,
        pb: 1
      }}>
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ 
          color: `${color}.main`,
          bgcolor: `${color}.light`,
          p: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 48
        }}>
          {icon}
        </Box>
      </CardContent>
      <Box sx={{ 
        px: 2, 
        pb: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}>
        {trend === "up" ? (
          <>
            <TrendingUp fontSize="small" color="success" />
            <Typography variant="caption" color="success.main">
              Crescimento
            </Typography>
          </>
        ) : trend === "down" ? (
          <>
            <TrendingDown fontSize="small" color="error" />
            <Typography variant="caption" color="error.main">
              Queda
            </Typography>
          </>
        ) : (
          <>
            <Remove fontSize="small" color="disabled" />
            <Typography variant="caption" color="text.disabled">
              Estável
            </Typography>
          </>
        )}
      </Box>
    </Card>
  );
};
    

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

  const MyOrders = () => {
    const [localFilter, setLocalFilter] = useState('todos');

    const getShippingStatus = (order) => {
      if (order.status === 'delivered' || order.status === 'Entregue') return 'Entregue';
      if (order.trackingNumber) return 'Enviado';
      if (order.status === 'approved') return 'Processando';
      return 'Pendente';
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'Entregue': return <CheckCircle color="success" />;
        case 'Enviado': return <LocalShipping color="info" />;
        case 'Processando': return <Pending color="warning" />;
        default: return <HourglassEmpty color="disabled" />;
      }
    };

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

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
              Filtrar por status:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['todos', 'pendente', 'processando', 'enviado', 'entregue'].map(status => (
                <Chip
                  key={status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  variant={localFilter === status ? 'filled' : 'outlined'}
                  color="primary"
                  onClick={() => setLocalFilter(status)}
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

  const SystemSettings = () => {
    if (!hasPermission(PERMISSIONS.SYSTEM_SETTINGS)) {
      return (
        <Alert severity="error">
          Você não tem permissão para acessar as configurações do sistema.
        </Alert>
      );
    }
    
    return (
      <Box>
        <Typography variant="h4" fontWeight="700" sx={{ mb: 4 }}>
          Configurações do Sistema
        </Typography>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configurações Gerais
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Limite de Estoque Baixo"
                  type="number"
                  value={systemSettings.lowStockThreshold}
                  onChange={(e) => setSystemSettings({...systemSettings, lowStockThreshold: parseInt(e.target.value) || 5})}
                  fullWidth
                  helperText="Número mínimo de itens para considerar estoque baixo"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Taxa de Impostos (%)"
                  type="number"
                  value={systemSettings.taxRate}
                  onChange={(e) => setSystemSettings({...systemSettings, taxRate: parseFloat(e.target.value) || 0})}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Custo de Envio Padrão (R$)"
                  type="number"
                  value={systemSettings.shippingCost}
                  onChange={(e) => setSystemSettings({...systemSettings, shippingCost: parseFloat(e.target.value) || 0})}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Moeda</InputLabel>
                  <Select
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                    label="Moeda"
                  >
                    <MenuItem value="BRL">Real Brasileiro (R$)</MenuItem>
                    <MenuItem value="USD">Dólar Americano (US$)</MenuItem>
                    <MenuItem value="EUR">Euro (€)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Backup e Restauração
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.automaticBackup}
                      onChange={(e) => setSystemSettings({...systemSettings, automaticBackup: e.target.checked})}
                    />
                  }
                  label="Backup Automático"
                />
                {systemSettings.automaticBackup && (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Frequência do Backup</InputLabel>
                    <Select
                      value={systemSettings.backupFrequency}
                      onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value})}
                      label="Frequência do Backup"
                    >
                      <MenuItem value="daily">Diário</MenuItem>
                      <MenuItem value="weekly">Semanal</MenuItem>
                      <MenuItem value="monthly">Mensal</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Backup />}
                    onClick={createBackup}
                    disabled={backupStatus.inProgress}
                  >
                    Criar Backup Agora
                  </Button>
                  {backupStatus.message && (
                    <Alert severity={backupStatus.success ? "success" : "error"}>
                      {backupStatus.message}
                    </Alert>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={saveSystemSettings}
            startIcon={<Save />}
          >
            Salvar Configurações
          </Button>
        </Box>
      </Box>
    );
  };

  const AuditLogs = () => {
    if (!hasPermission(PERMISSIONS.SYSTEM_SETTINGS)) {
      return (
        <Alert severity="error">
          Você não tem permissão para visualizar os logs de auditoria.
        </Alert>
      );
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="700">
            Logs de Auditoria
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => fetchAuditLogs('first')}
          >
            Atualizar
          </Button>
        </Box>

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Ação</TableCell>
                    <TableCell>Alvo</TableCell>
                    <TableCell>Detalhes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => {
                    const meta = getAuditActionMeta(log.action);
                    return (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          {format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          {log.user?.name || 'Usuário Desconhecido'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={meta.icon} 
                            label={meta.text} 
                            color={meta.color} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {formatAuditTarget(log.target)}
                        </TableCell>
                        <TableCell>
                          <Button size="small" onClick={() => handleViewLogDetails(log)}>Ver Detalhes</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
              <Button
                onClick={() => alert('Paginação anterior ainda não implementada.')} // Simplificado por agora
                disabled={auditLogPage === 1}
              >
                Anterior
              </Button>
              <Typography sx={{ alignSelf: 'center' }}>
                Página {auditLogPage}
              </Typography>
              <Button
                onClick={() => fetchAuditLogs('next')}
                disabled={isLastAuditLogPage}
              >
                Próxima
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const CategoriesManagement = () => {
    if (!hasPermission(PERMISSIONS.VIEW_CATEGORIES)) {
      return <Alert severity="error">Você não tem permissão para gerenciar categorias.</Alert>;
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight="700">
            Gestão de Categorias
          </Typography>
          {hasPermission(PERMISSIONS.EDIT_CATEGORIES) && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditingCategory(null);
                resetCategoryForm();
              }}
            >
              Nova Categoria
            </Button>
          )}
        </Box>

        <Grid container spacing={4}>
          {hasPermission(PERMISSIONS.EDIT_CATEGORIES) && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Nome da Categoria"
                        name="name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                        fullWidth
                        required
                        error={!!validationErrors.categoryName}
                        helperText={validationErrors.categoryName}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>Subcategorias</Typography>
                      {newCategory.subcategories.map((subcat, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <TextField
                            label={`Subcategoria ${index + 1}`}
                            value={subcat}
                            onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                            fullWidth
                            size="small"
                          />
                          <IconButton
                            onClick={() => {
                              const updatedSubcategories = newCategory.subcategories.filter((_, i) => i !== index);
                              setNewCategory((prev) => ({ ...prev, subcategories: updatedSubcategories }));
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      <Button startIcon={<Add />} onClick={addSubcategory} size="small">
                        Adicionar Subcategoria
                      </Button>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {editingCategory && (
                        <Button variant="outlined" onClick={resetCategoryForm}>
                          Cancelar
                        </Button>
                      )}
                      <Button variant="contained" onClick={saveCategory}>
                        {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} md={hasPermission(PERMISSIONS.EDIT_CATEGORIES) ? 8 : 12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Categorias Cadastradas</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Subcategorias</TableCell>
                        {hasPermission(PERMISSIONS.EDIT_CATEGORIES) && <TableCell align="right">Ações</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id} hover>
                          <TableCell>{category.name}</TableCell>
                          <TableCell sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {category.subcategories.map(sc => <Chip key={sc} label={sc} size="small" />)}
                          </TableCell>
                          {hasPermission(PERMISSIONS.EDIT_CATEGORIES) && (
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => startEditingCategory(category)}><Edit fontSize="small" /></IconButton>
                              {hasPermission(PERMISSIONS.DELETE_CATEGORIES) && <IconButton size="small" onClick={() => deleteCategory(category.id)}><Delete fontSize="small" /></IconButton>}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Acesso não autorizado
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Você precisa estar logado para acessar esta página.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.location.href = '/login'}>
          Fazer Login
        </Button>
      </Box>
    );
  }

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
      
      <Dialog open={logDetailsOpen} onClose={handleCloseLogDetails} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes da Ação</DialogTitle>
        <DialogContent dividers>
          {selectedLogDetails && <FriendlyLogDetails log={selectedLogDetails} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogDetails} variant="contained">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Exportar Dados</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Selecione o formato e o intervalo para exportação:
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Formato</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              label="Formato"
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Intervalo</InputLabel>
            <Select
              value={exportRange}
              onChange={(e) => setExportRange(e.target.value)}
              label="Intervalo"
            >
              <MenuItem value="all">Todos os dados</MenuItem>
              <MenuItem value="today">Hoje</MenuItem>
              <MenuItem value="week">Esta semana</MenuItem>
              <MenuItem value="month">Este mês</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancelar</Button>
          <Button onClick={() => exportData(exportFormat, exportRange)} variant="contained">
            Exportar
          </Button>
        </DialogActions>
      </Dialog>

      <NavBar />
      
      {notifications.filter(n => !n.read).length > 0 && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
            <Button
              variant="contained"
              startIcon={<Notifications />}
              onClick={() => {}}
            >
              Notificações
            </Button>
          </Badge>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          maxWidth: 1440,
          margin: "auto",
          bgcolor: "background.default",
        }}
      >
        {sidebarOpen && (
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
              display: isMobile ? 'none' : 'block'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AccountCircle sx={{ mr: 2 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="600">
                  {currentUser.displayName || currentUser.email}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {userRole}
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Funcionalidades
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[
                { id: "dashboard", icon: <DashboardIcon />, label: "Dashboard", permission: PERMISSIONS.VIEW_FINANCE },
                { id: "products", icon: <Inventory />, label: "Produtos", permission: PERMISSIONS.VIEW_PRODUCTS },
                { id: "productList", icon: <ListIcon />, label: "Lista de Produtos", permission: PERMISSIONS.VIEW_PRODUCTS },
                { id: "categories", icon: <CategoryIcon />, label: "Categorias", permission: PERMISSIONS.VIEW_CATEGORIES },
                { id: "suppliers", icon: <Business />, label: "Fornecedores", permission: PERMISSIONS.VIEW_SUPPLIERS },
                { id: "myOrders", icon: <LocalShipping />, label: "Meus Pedidos", permission: PERMISSIONS.VIEW_SALES },
                { id: "payments", icon: <Paid />, label: "Pagamentos", permission: PERMISSIONS.VIEW_FINANCE },
                { id: "reports", icon: <Assessment />, label: "Relatórios", permission: PERMISSIONS.VIEW_REPORTS },
                { id: "users", icon: <People />, label: "Usuários", permission: PERMISSIONS.VIEW_USERS },
                { id: "settings", icon: <Settings />, label: "Configurações", permission: PERMISSIONS.SYSTEM_SETTINGS },
                { id: "audit", icon: <History />, label: "Logs de Auditoria", permission: PERMISSIONS.SYSTEM_SETTINGS },
              ].filter(item => hasPermission(item.permission)).map((item) => (
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
            
            <Divider sx={{ my: 3 }} />
            
            <Button
              startIcon={<Logout />}
              onClick={() => signOut(auth)}
              variant="outlined"
              color="error"
              fullWidth
              sx={{ borderRadius: 3 }}
            >
              Sair
            </Button>
          </Paper>
        )}

        {/* Main Content */}
        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            p: 4,
            "& .MuiCard-root": { borderRadius: 4 },
            "& .MuiPaper-root": { borderRadius: 4 },
          }}
        >
          <Breadcrumbs sx={{ mb: 3 }}>
            <Typography color="text.primary">Sistema</Typography>
            <Typography color="text.primary">
              {activeView === 'dashboard' && 'Dashboard'}
              {activeView === 'products' && 'Cadastro de Produtos'}
              {activeView === 'productList' && 'Lista de Produtos'}
              {activeView === 'categories' && 'Categorias'}
              {activeView === 'suppliers' && 'Fornecedores'}
              {activeView === 'myOrders' && 'Meus Pedidos'}
              {activeView === 'payments' && 'Pagamentos'}
              {activeView === 'reports' && 'Relatórios'}
              {activeView === 'users' && 'Usuários'}
              {activeView === 'settings' && 'Configurações'}
              {activeView === 'audit' && 'Logs de Auditoria'}
            </Typography>
          </Breadcrumbs>

          <SpeedDial
            ariaLabel="Ações rápidas"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            icon={<SpeedDialIcon />}
            open={speedDialOpen}
            onOpen={() => setSpeedDialOpen(true)}
            onClose={() => setSpeedDialOpen(false)}
          >
            {hasPermission(PERMISSIONS.EDIT_PRODUCTS) && (
              <SpeedDialAction
                icon={<Add />}
                tooltipTitle="Novo Produto"
                onClick={() => {
                  setActiveView('products');
                  setSpeedDialOpen(false);
                }}
              />
            )}
            {hasPermission(PERMISSIONS.EXPORT_DATA) && (
              <SpeedDialAction
                icon={<Download />}
                tooltipTitle="Exportar Dados"
                onClick={() => {
                  setExportDialogOpen(true);
                  setSpeedDialOpen(false);
                }}
              />
            )}
            {hasPermission(PERMISSIONS.BACKUP_RESTORE) && (
              <SpeedDialAction
                icon={<Backup />}
                tooltipTitle="Criar Backup"
                onClick={() => {
                  createBackup();
                  setSpeedDialOpen(false);
                }}
              />
            )}
          </SpeedDial>

          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'products' && (
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

              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Accordion 
                    expanded={expandedProductForm}
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
                                  error={!!validationErrors[field]}
                                  helperText={validationErrors[field]}
                                  required
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
                                error={!!validationErrors.category}
                                helperText={validationErrors.category}
                                required
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
                          <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: 'wrap' }}>
                            {newProduct.imageUrls.map((imageUrl, index) => (
                              <Box
                                key={index}
                                sx={{ position: "relative", display: 'inline-block' }}
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
                            {[
                              { field: "costPrice", label: "Preço de Custo", type: "number", prefix: "R$" },
                              { field: "salePrice", label: "Preço de Venda", type: "number", prefix: "R$", required: true },
                              { field: "discount", label: "Desconto (%)", type: "number", suffix: "%" },
                              { field: "weight", label: "Peso (kg)", type: "number" }
                            ].map(({ field, label, type, prefix, suffix, required }) => (
                              <Grid item xs={6} md={3} key={field}>
                                <TextField
                                  label={label}
                                  name={field}
                                  value={newProduct[field]}
                                  onChange={handleInputChange}
                                  fullWidth
                                  type={type}
                                  InputProps={{
                                    startAdornment: prefix && <InputAdornment position="start">{prefix}</InputAdornment>,
                                    endAdornment: suffix && <InputAdornment position="end">{suffix}</InputAdornment>,
                                  }}
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    max: field === "discount" ? 100 : undefined,
                                    step: field === "discount" ? 1 : 0.01
                                  }}
                                  error={!!validationErrors[field]}
                                  helperText={validationErrors[field]}
                                  required={required}
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
                                  inputProps={{ min: 0, step: 0.1 }}
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
                                mt: 2,
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
                                  sx={{ p: 2, mb: 2 }}
                                >
                                  <Grid container spacing={2} alignItems="center">
                                    {[
                                      { field: "size", label: "Tamanho", type: "text" },
                                      { field: "color", label: "Cor", type: "text" },
                                      { field: "model", label: "Modelo", type: "text" },
                                      { field: "stock", label: "Estoque", type: "number", min: 0 }
                                    ].map(({ field, label, type, min }) => (
                                      <Grid item xs={6} md={3} key={field}>
                                        <TextField
                                          label={label}
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
                                          type={type}
                                          inputProps={{ min }}
                                          error={!!validationErrors[`variation-${index}-${field}`]}
                                          helperText={validationErrors[`variation-${index}-${field}`]}
                                        />
                                      </Grid>
                                    ))}
                                    <Grid item xs={12} md={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                      <IconButton
                                        color="error"
                                        onClick={() => removeVariation(index)}
                                        disabled={newProduct.variations.length <= 1}
                                      >
                                        <Delete />
                                      </IconButton>
                                    </Grid>
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
          
          {activeView === 'productList' && (
            <>
              <Box
                  sx={{display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 4,
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <ListIcon
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
                  {hasPermission(PERMISSIONS.EXPORT_DATA) && (
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => setExportDialogOpen(true)}
                    >
                      Exportar
                    </Button>
                  )}
                </Box>
              </Box>

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
                            <MenuItem value={96}>96</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

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

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  {filteredProducts.length} produtos encontrados
                  {Object.values(filters).some(val => val !== '' && val !== false) && 
                    " (com filtros aplicados)"}
                </Typography>
              </Box>

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
                        <Grid item xs={12} sm={6} md={4} lg={4} key={product.id}>
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
                                color="warning"
                                size="small"
                                sx={{
                                  position: "absolute",
                                  right: 16,
                                  top: 16,
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            {isOutOfStock && product.enabled && (
                              <Chip
                                label="Sem Estoque"
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
                                    Math.min((totalStock / (product.minStock || 1)) * 100, 100)
                                  }
                                  color={
                                    isOutOfStock ? "error" : 
                                    isLowStock ? "warning" : "primary"
                                  }
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
                                {product.oldPrice && product.oldPrice > product.salePrice ? (
                                  <>
                                    <Typography
                                      variant="body2"
                                      color="textSecondary"
                                      sx={{ textDecoration: "line-through", mr: 1 }}
                                    >
                                      R$ {Number(product.oldPrice).toFixed(2)}
                                    </Typography>
                                    <Typography
                                      variant="h6"
                                      color="primary"
                                      sx={{ fontWeight: "bold", display: "inline" }}
                                    >
                                      R$ {Number(product.salePrice).toFixed(2)}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
                                    R$ {Number(product.salePrice).toFixed(2)}
                                  </Typography>
                                )}
                              </Box>

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
                                {hasPermission(PERMISSIONS.EDIT_PRODUCTS) && (
                                  <Button
                                    variant="outlined"
                                    startIcon={<Edit />}
                                    onClick={() => startEditing(product)}
                                    color="info"
                                  >
                                    Editar
                                  </Button>
                                )}
                                {hasPermission(PERMISSIONS.EDIT_PRODUCTS) && (
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
                                )}
                                {hasPermission(PERMISSIONS.DELETE_PRODUCTS) && (
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Delete />}
                                    onClick={() => deleteProduct(product.id)}
                                  >
                                    Excluir
                                  </Button>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4, flexWrap: 'wrap', gap: 2 }}>
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
                        <MenuItem value={96}>96</MenuItem>
                      </Select>
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: 'wrap' }}>
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
          
          {activeView === 'categories' && <CategoriesManagement />}
          {activeView === 'suppliers' && (
            <Box>
              <Typography variant="h4" fontWeight="700" sx={{ mb: 4 }}>
                Gestão de Fornecedores
              </Typography>
              
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Nome do Fornecedor"
                        name="name"
                        value={newSupplier.name}
                        onChange={handleSupplierInputChange}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Pessoa de Contato"
                        name="contact"
                        value={newSupplier.contact}
                        onChange={handleSupplierInputChange}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={newSupplier.email}
                        onChange={handleSupplierInputChange}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Telefone"
                        name="phone"
                        value={newSupplier.phone}
                        onChange={handleSupplierInputChange}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Endereço"
                        name="address"
                        value={newSupplier.address}
                        onChange={handleSupplierInputChange}
                        fullWidth
                        multiline
                        rows={3}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          onClick={resetSupplierForm}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="contained"
                          onClick={saveSupplier}
                        >
                          {editingSupplier ? "Atualizar" : "Cadastrar"} Fornecedor
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Fornecedores Cadastrados
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Nome</TableCell>
                          <TableCell>Contato</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Telefone</TableCell>
                          <TableCell>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {suppliers.map((supplier) => (
                          <TableRow key={supplier.id}>
                            <TableCell>{supplier.name}</TableCell>
                            <TableCell>{supplier.contact}</TableCell>
                            <TableCell>{supplier.email}</TableCell>
                            <TableCell>{supplier.phone}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => startEditingSupplier(supplier)}
                                  color="primary"
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => deleteSupplier(supplier.id)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          )}
          
          {activeView === 'myOrders' && <MyOrders />}
          {activeView === 'payments' && <PaymentManagement />}
          {activeView === 'reports' && (
            <SalesStockReports
              products={products}
              sales={completedSales}
              deliveredSales={deliveredSales}
            />
          )}
          {activeView === 'users' && (
            <Box>
              <Typography variant="h4" fontWeight="700" sx={{ mb: 4 }}>
                Gestão de Usuários
              </Typography>

              <Card>
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Nome</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Função</TableCell>
                          <TableCell>Último Acesso</TableCell>
                          <TableCell>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.details?.fullName || 'N/A'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip 
                                label={user.role} 
                                color={
                                  user.role === 'admin' ? 'error' : 
                                  user.role === 'manager' ? 'warning' : 'default'
                                } 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>
                              {user.lastLogin?.toDate?.() ? 
                                user.lastLogin.toDate().toLocaleString() : 
                                'Nunca acessou'}
                            </TableCell>
                            <TableCell>
                              {user.role !== 'admin' && hasPermission(PERMISSIONS.EDIT_USERS) && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => makeAdmin(user.id)}
                                >
                                  Tornar Admin
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          )}
          {activeView === 'settings' && <SystemSettings />}
          {activeView === 'audit' && <AuditLogs />}
        </Box>
      </Box>
      <Footer />
    </div>
  );
}

export default StockManagement;