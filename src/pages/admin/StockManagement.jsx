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
  Alert
} from "@mui/material";
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
} from "firebase/firestore";
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
  const formRef = useRef(null);

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
      await updateDoc(doc(db, "products", productId), {
        enabled: !currentStatus,
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
  }, []);

  const makeAdmin = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: "admin" });
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
      async (snapshot) => {
        const salesData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const saleData = doc.data();
            const clientQuery = await getDocs(
              collection(db, "sales", doc.id, "client")
            );
            const clientData = clientQuery.docs.map((clientDoc) =>
              clientDoc.data()
            )[0];

            let addressData = {};
            if (clientQuery.docs.length > 0) {
              const addressQuery = await getDocs(
                collection(
                  db,
                  "sales",
                  doc.id,
                  "client",
                  clientQuery.docs[0].id,
                  "address"
                )
              );
              addressData = addressQuery.docs.map((addressDoc) =>
                addressDoc.data()
              )[0];
            }

            return {
              id: doc.id,
              ...saleData,
              date: saleData.date?.toDate(),
              client: clientData,
              address: addressData,
            };
          })
        );

        setSales(salesData.filter((sale) => sale.status === "Pendente"));
        setRequestedSales(salesData.filter((sale) => sale.status === "Solicitada"));
        setDeliveredSales(salesData.filter((sale) => sale.status === "Entregue"));
        setTotalSales(salesData.reduce((acc, sale) => acc + sale.total, 0));
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
      const categoryData = {
        name: newCategory.name,
        subcategories: newCategory.subcategories,
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
            .printable-content { max-width: 800px; margin: 0 auto; }
            h6 { font-size: 18px; }
            p { font-size: 14px; }
          </style>
        </head>
        <body>
          <div id="print-content"></div>
        </body>
      </html>
    `);

    const printContent = printWindow.document.getElementById("print-content");
    printWindow.ReactDOM.render(
      <OrderPrintContent sale={sale} />,
      printContent
    );

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
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
        enabled: newProduct.enabled && totalStock > 0, // Só ativa se houver estoque
        createdAt: editingProduct ? newProduct.createdAt : new Date(),
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
      if (editingSupplier) {
        await updateDoc(doc(db, "suppliers", editingSupplier.id), newSupplier);
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === editingSupplier.id
              ? { ...newSupplier, id: editingSupplier.id }
              : s
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "suppliers"), newSupplier);
        setSuppliers((prev) => [...prev, { ...newSupplier, id: docRef.id }]);
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
      await updateDoc(doc(db, "sales", saleId), { shipped: true, status: "Enviado" });
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
      await updateDoc(doc(db, "sales", saleId), { shipped: false, status: "Pendente" });
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
      await updateDoc(doc(db, "sales", saleId), { status: "Entregue" });
      setSalesHistory((prev) =>
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
      await updateDoc(doc(db, "sales", saleId), { status: "Pendente" });

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
              { id: "requested", icon: <LocalShipping />, label: "Solicitadas" },
              { id: "suppliers", icon: <BusinessIcon />, label: "Fornecedores" },
              { id: "orders", icon: <LocalShipping />, label: "Pedidos" },
              { id: "delivered", icon: <CheckCircle />, label: "Entregues" },
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
                          label: "Vendas Totais",
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
                                      <Box sx={{ maxHeight: 200, overflowY: "auto", mb: 2 }}>
                                        {category.subcategories
                                          .sort((a, b) => a.localeCompare(b))
                                          .map((subcategory, index) => (
                                            <Accordion key={index} elevation={0} sx={{ mb: 1 }}>
                                              <AccordionSummary expandIcon={<ExpandMore />}>
                                                <Typography variant="caption" fontWeight="500">
                                                  {subcategory}
                                                </Typography>
                                              </AccordionSummary>
                                              <AccordionDetails sx={{ p: 1 }}>
                                                {getProductsBySubcategory(category.name, subcategory).map((product) => (
                                                  <Box
                                                    key={product.id}
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 1,
                                                      mb: 1,
                                                    }}
                                                  >
                                                    <Avatar
                                                      src={product.imageUrls[0]}
                                                      variant="rounded"
                                                      sx={{ width: 30, height: 30 }}
                                                    />
                                                    <Box>
                                                      <Typography variant="caption" fontWeight="500">
                                                        {product.name}
                                                      </Typography>
                                                      <Typography variant="caption" color="textSecondary">
                                                        Estoque:{" "}
                                                        {product.variations.reduce(
                                                          (acc, curr) => acc + (curr.stock || 0),
                                                          0
                                                        )}
                                                      </Typography>
                                                    </Box>
                                                  </Box>
                                                ))}
                                              </AccordionDetails>
                                            </Accordion>
                                          ))}
                                      </Box>
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

                {activeView === "requested" && (
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
                        <LocalShipping
                          sx={{
                            fontSize: 40,
                            color: "primary.main",
                            bgcolor: "primary.light",
                            p: 1.5,
                            borderRadius: 4,
                          }}
                        />
                        <Typography variant="h4" fontWeight="700">
                          Compras Solicitadas
                        </Typography>
                      </Box>
                    </Box>

                    <Card sx={{ mb: 4 }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                          Pedidos Solicitados ({requestedSales.length})
                        </Typography>
                        <Grid container spacing={2}>
                          {requestedSales.map((sale) => (
                            <Grid item xs={12} key={sale.id}>
                              <Paper
                                variant="outlined"
                                sx={{ p: 2, borderRadius: 3 }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <Box>
                                 
                                    <Typography variant="body2" color="textSecondary">
                                      {sale.items.length} itens • R$ {Number(sale.total).toFixed(2)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={() => handlePrintOrder(sale)}
                                      startIcon={<Print />}
                                    >
                                      Imprimir
                                    </Button>
                                  </Box>
                                </Box>

                                <Divider sx={{ my: 2 }} />
                                <Box>
                                  {sale.items.map((item) => (
                                    <Box
                                      key={item.id}
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        mb: 1,
                                      }}
                                    >
                                      <Typography variant="body2">
                                        {item.name} ({item.quantity})
                                      </Typography>
                                      <Typography variant="body2" fontWeight="500">
                                        R$ {Number(item.price).toFixed(2)}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>

                                <Divider sx={{ my: 2 }} />
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 1,
                                  }}
                                >
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => deleteRequestedSale(sale.id)}
                                    startIcon={<Delete />}
                                  >
                                    Excluir
                                  </Button>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => confirmRequestedSale(sale.id)}
                                    startIcon={<CheckCircle />}
                                  >
                                    Confirmar
                                  </Button>
                                </Box>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
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
          </Box>
        </Box>
      </Box>
      <Footer />
    </div>
  );

}

export default StockManagement;