import React, { useState, useEffect } from "react";
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

function StockManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeView, setActiveView] = useState("products");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [requestedSales, setRequestedSales] = useState([]); // Novo estado para "compra solicitada"
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
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    minStock: 1,
    location: "",
    reservedStock: 0,
    supplierId: "",
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
  const [categories, setCategories] = useState([]); // Lista de categorias
  const [newCategory, setNewCategory] = useState({
    name: "", // Nome da categoria
    subcategories: [], // Lista de subcategorias
  });
  const [editingCategory, setEditingCategory] = useState(null); // Categoria em edição

  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState({});
  const [deliveredSales, setDeliveredSales] = useState([]);

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const filteredSales = sales.filter((sale) => {
    // Filtro por status
    if (filter === "pending" && sale.shipped) return false;
    if (filter === "shipped" && !sale.shipped) return false;

    // Filtro por pesquisa
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

  // =================== Firebase Operations ===================
  useEffect(() => {
    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          variations: doc.data().variations || [],
        }));
        setProducts(productsData);
      }
    );
    const unsubscribeCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id, // ID do documento
          ...doc.data(), // Dados da categoria
        }));
        setCategories(categoriesData); // Atualiza o estado com as categorias
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
        setRequestedSales(salesData.filter((sale) => sale.status === "Solicitada")); // Filtra "compra solicitada"
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
  // =================== categories Functions ===================

  const getProductsBySubcategory = (categoryName, subcategoryName) => {
    return products.filter(
      (product) =>
        product.category === categoryName &&
        product.subcategory === subcategoryName
    );
  };
  // Salvar ou editar categoria
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
        // Editar categoria existente
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
        // Adicionar nova categoria
        const docRef = await addDoc(collection(db, "categories"), categoryData);
        setCategories((prev) => [...prev, { ...categoryData, id: docRef.id }]);
      }

      resetCategoryForm(); // Limpa o formulário
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    }
  };

  // Resetar formulário
  const resetCategoryForm = () => {
    setNewCategory({
      name: "",
      subcategories: [],
    });
    setEditingCategory(null);
  };

  // Iniciar edição de uma categoria
  const startEditingCategory = (category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      subcategories: category.subcategories || [], // Garanta que subcategorias seja um array
    });
    console.log("editando");
  };

  // Adicionar subcategoria
  const addSubcategory = () => {
    setNewCategory((prev) => ({
      ...prev,
      subcategories: [...prev.subcategories, ""], // Adiciona uma nova subcategoria vazia
    }));
  };

  // Alterar subcategoria
  const handleSubcategoryChange = (index, value) => {
    const updatedSubcategories = [...newCategory.subcategories];
    updatedSubcategories[index] = value; // Atualiza a subcategoria no índice especificado
    setNewCategory((prev) => ({
      ...prev,
      subcategories: updatedSubcategories,
    }));
  };

  // =================== imprimir funções ===================
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

    // Renderiza o conteúdo do pedido na nova janela
    const printContent = printWindow.document.getElementById("print-content");
    printWindow.ReactDOM.render(
      <OrderPrintContent sale={sale} />,
      printContent
    );

    // Aguarda o conteúdo ser renderizado e imprime
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
  // =================== Product Functions ===================
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
      const productData = {
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        name: newProduct.name,
        description: newProduct.description,
        imageUrls: newProduct.imageUrls, // Lista de URLs
        category: newProduct.category,
        subcategory: newProduct.subcategory,
        variations: newProduct.variations.map((v) => ({
          size: v.size,
          color: v.color,
          model: v.model,
          stock: parseInt(v.stock, 10) || 0, // Garante que o estoque seja um número
        })),
        costPrice: parseFloat(newProduct.costPrice) || 0,
        salePrice: parseFloat(newProduct.salePrice) || 0,
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
      };

      if (editingProduct) {
        // Atualiza o produto existente
        await updateDoc(doc(db, "products", editingProduct.id), productData);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...productData, id: editingProduct.id }
              : p
          )
        );
      } else {
        // Adiciona um novo produto
        const docRef = await addDoc(collection(db, "products"), productData);
        setProducts((prev) => [...prev, { ...productData, id: docRef.id }]);
      }

      resetForm(); // Limpa o formulário
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
    setEditingProduct(product);
    setNewProduct({
      ...product,
      variations: product.variations || [],
    });
  };

  // =================== Supplier Functions ===================
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

  // =================== Order Functions ===================
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

  // Função para mover uma venda de "Solicitada" para "Pendente"
  const confirmRequestedSale = async (saleId) => {
    try {
      await updateDoc(doc(db, "sales", saleId), { status: "Pendente" });
      setRequestedSales((prev) =>
        prev.filter((sale) => sale.id !== saleId)
      );
      setSales((prev) => [
        ...prev,
        { ...requestedSales.find((sale) => sale.id === saleId), status: "Pendente" },
      ]);
    } catch (error) {
      console.error("Erro ao confirmar solicitação:", error);
    }
  };

  // Função para excluir uma venda solicitada
  const deleteRequestedSale = async (saleId) => {
    try {
      await deleteDoc(doc(db, "sales", saleId));
      setRequestedSales((prev) => prev.filter((sale) => sale.id !== saleId));
      showToast("Compra solicitada excluída com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao excluir compra solicitada:", error);
      showToast("Erro ao excluir compra solicitada. Tente novamente.", "error");
    }
  };

  // =================== Helper Functions ===================
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
      weight: "",
      dimensions: { length: "", width: "", height: "" },
      minStock: 0,
      location: "",
      reservedStock: 0,
      supplierId: "",
    });
    setEditingProduct(null);
  };

  // =================== Render ===================
  return (
    <div className={styles.container}>
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
              { id: "requested", icon: <LocalShipping />, label: "Solicitadas" }, // Novo item no menu
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

        {/* Conteúdo Principal */}
        <Box
          sx={{
            flexGrow: 1,
            p: 4,
            "& .MuiCard-root": { borderRadius: 4 },
            "& .MuiPaper-root": { borderRadius: 4 },
          }}
        >
          {activeView === "products" && (
            <>
              {/* Seção de Produtos */}
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
                <TextField
                  variant="outlined"
                  placeholder="Pesquisar produtos..."
                  InputProps={{
                    startAdornment: (
                      <Search sx={{ color: "action.active", mr: 1 }} />
                    ),
                  }}
                  sx={{ width: 300 }}
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
              {/*categories Form*/}
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

    {/* Botão para adicionar nova categoria */}
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => {
          setEditingCategory(null); // Limpa a edição atual
          setNewCategory({ name: "", subcategories: [] }); // Reseta o formulário
        }}
      >
        Adicionar Categoria
      </Button>
    </Box>

    {/* Contêiner com barra de rolagem para a lista de categorias */}
    <Box sx={{ maxHeight: 400, overflowY: "auto", mb: 2 }}>
      <Grid container spacing={2}> {/* Reduzi o espaçamento entre os cards */}
        {categories.map((category) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}> {/* Aumentei o número de colunas */}
            <Card variant="outlined" sx={{ p: 1 }}> {/* Reduzi o padding interno */}
              <CardContent sx={{ p: 1 }}> {/* Reduzi o padding interno */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="600"> {/* Reduzi o tamanho da fonte */}
                      {category.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary"> {/* Reduzi o tamanho da fonte */}
                      Subcategorias: {category.subcategories.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton size="small" onClick={() => startEditingCategory(category)}> {/* Reduzi o tamanho do ícone */}
                      <Edit fontSize="small" color="info" />
                    </IconButton>
                    <IconButton size="small" onClick={() => deleteCategory(category.id)}> {/* Reduzi o tamanho do ícone */}
                      <Delete fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Lista de subcategorias com scroll e ordenação alfabética */}
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ maxHeight: 200, overflowY: "auto", mb: 2 }}> {/* Contêiner com scroll */}
                    {category.subcategories
                      .sort((a, b) => a.localeCompare(b)) // Ordena as subcategorias alfabeticamente
                      .map((subcategory, index) => (
                        <Accordion key={index} elevation={0} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="caption" fontWeight="500"> {/* Reduzi o tamanho da fonte */}
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

    {/* Formulário de categoria (sempre visível) */}
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
                    setNewCategory((prev) => ({ ...prev, subcategories: updatedSubcategories }));
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
                  <Accordion defaultExpanded elevation={0}>
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
                            {["sku", "barcode", "name"].map((field) => (
                              <Grid item xs={12} md={6} key={field}>
                                <TextField
                                  label={
                                    field === "sku"
                                      ? "SKU"
                                      : field.charAt(0).toUpperCase() +
                                      field.slice(1)
                                  }
                                  name={field}
                                  value={newProduct[field]}
                                  onChange={handleInputChange}
                                  fullWidth
                                  size="small"
                                  variant="filled"
                                />
                              </Grid>
                            ))}

                            {/* Campo de Categoria Dinâmico */}
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

                            {/* Campo de Subcategoria Dinâmico */}
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
                                disabled={!newProduct.category} // Desabilita se não houver categoria selecionada
                                SelectProps={{
                                  native: true,
                                }}
                              >
                                <option value=""></option>
                                {categories
                                  .find(
                                    (cat) => cat.name === newProduct.category
                                  ) // Encontra a categoria selecionada
                                  ?.subcategories.map(
                                    (
                                      subcat,
                                      index // Mapeia as subcategorias
                                    ) => (
                                      <option key={index} value={subcat}>
                                        {subcat}
                                      </option>
                                    )
                                  )}
                              </TextField>
                            </Grid>
                          </Grid>

                          {/* Campo de Fornecedor (mantido) */}
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
                        {/* campo de imagem */}
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
            // Remove a imagem do estado
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
                            {/* Campos de Preço e Peso */}
                            {["costPrice", "salePrice", "weight"].map(
                              (field) => (
                                <Grid item xs={4} key={field}>
                                  <TextField
                                    label={
                                      field === "costPrice"
                                        ? "Preço de Custo"
                                        : field === "salePrice"
                                          ? "Preço de Venda"
                                          : "Peso (kg)"
                                    }
                                    name={field}
                                    value={newProduct[field]}
                                    onChange={handleInputChange}
                                    fullWidth
                                    type="number"
                                    InputProps={{
                                      startAdornment:
                                        field.includes("Price") && "R$",
                                    }}
                                    size="small"
                                    inputProps={{ min: 0 }} // Garante que o valor não seja negativo
                                  />
                                </Grid>
                              )
                            )}

                            {/* Campos de Dimensões */}
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
                                  inputProps={{ min: 0 }} // Garante que o valor não seja negativo
                                />
                              </Grid>
                            ))}
                          </Grid>

                          {/* Seção de Variações */}
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
                                    {/* Campos de Variação */}
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
                                            inputProps={{ min: 0 }} // Garante que o estoque não seja negativo
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
                                onClick={resetForm}
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

              {/* Product List */}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                    Lista de Produtos
                    <Chip
                      label={`${products.length} itens`}
                      size="small"
                      sx={{ ml: 2, bgcolor: "action.selected" }}
                    />
                  </Typography>

                  <Grid container spacing={3}>
                    {products.map((product) => {
                      const totalStock = product.variations?.reduce(
                        (acc, curr) => acc + (curr.stock || 0),
                        0
                      );
                      const isLowStock = totalStock < product.minStock;

                      return (
                        <Grid item xs={12} sm={6} md={4} key={product.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              position: "relative",
                              "&:hover": { boxShadow: 4 },
                            }}
                          >
                            {isLowStock && (
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
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  Excluir
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
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
                              <Typography
                                variant="subtitle2"
                                color="textSecondary"
                              >
                                #{sale.id.slice(0, 8).toUpperCase()} •{" "}
                                {sale.date?.toLocaleDateString("pt-BR")}
                              </Typography>
                              <Typography variant="body1" fontWeight="500">
                                {sale.user?.details.fullName ||
                                  "Cliente não identificado"}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {sale.items.length} itens • R${" "}
                                {sale.total.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", gap: 2 }}>
                              <Button
                                variant="contained"
                                startIcon={<CheckCircle />}
                                onClick={() => confirmRequestedSale(sale.id)}
                                sx={{ borderRadius: 3 }}
                              >
                                Confirmar Pagamento
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => deleteRequestedSale(sale.id)}
                                sx={{ borderRadius: 3 }}
                              >
                                Excluir
                              </Button>
                            </Box>
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
            <>
              {/* Seção de Fornecedores */}
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
                  <BusinessIcon
                    sx={{
                      fontSize: 40,
                      color: theme.palette.primary.main,
                      bgcolor: theme.palette.primary.light,
                      p: 1.5,
                      borderRadius: 4,
                    }}
                  />
                  <Typography variant="h4" fontWeight="700">
                    Gestão de Fornecedores
                  </Typography>
                </Box>
              </Box>

              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                    Lista de Fornecedores
                    <Chip
                      label={`${suppliers.length} cadastrados`}
                      size="small"
                      sx={{ ml: 2, bgcolor: "action.selected" }}
                    />
                  </Typography>

                  <Grid container spacing={3}>
                    {suppliers.map((supplier) => {
                      const suppliedProducts = products.filter(
                        (p) => p.supplierId === supplier.id
                      );

                      return (
                        <Grid item xs={12} md={6} key={supplier.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight="600"
                                  >
                                    {supplier.name}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    {supplier.contact}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <IconButton
                                    onClick={() =>
                                      startEditingSupplier(supplier)
                                    }
                                  >
                                    <Edit fontSize="small" color="info" />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => deleteSupplier(supplier.id)}
                                  >
                                    <Delete fontSize="small" color="error" />
                                  </IconButton>
                                </Box>
                              </Box>

                              <Box sx={{ mt: 2 }}>
                                <Chip
                                  icon={<LinkIcon />}
                                  label={`Fornece ${suppliedProducts.length} produtos`}
                                  variant="outlined"
                                  sx={{ mb: 1 }}
                                />
                                <Typography variant="body2">
                                  <ContactsIcon
                                    fontSize="small"
                                    sx={{ mr: 1 }}
                                  />
                                  {supplier.email} | {supplier.phone}
                                </Typography>
                                <Typography variant="body2">
                                  <BusinessIcon
                                    fontSize="small"
                                    sx={{ mr: 1 }}
                                  />
                                  {supplier.address}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Accordion elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6" fontWeight="600">
                        {editingSupplier
                          ? "Editar Fornecedor"
                          : "Novo Fornecedor"}
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
                            <BusinessIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle1" color="primary">
                              Informações do Fornecedor
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            {[
                              "name",
                              "contact",
                              "email",
                              "phone",
                              "address",
                            ].map((field) => (
                              <Grid item xs={12} md={6} key={field}>
                                <TextField
                                  label={
                                    field.charAt(0).toUpperCase() +
                                    field.slice(1)
                                  }
                                  name={field}
                                  value={newSupplier[field]}
                                  onChange={handleSupplierInputChange}
                                  fullWidth
                                  size="small"
                                  variant="filled"
                                />
                              </Grid>
                            ))}
                          </Grid>
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
                            {editingSupplier && (
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={resetSupplierForm}
                              >
                                Cancelar Edição
                              </Button>
                            )}
                            <Button
                              variant="contained"
                              startIcon={
                                editingSupplier ? <CheckCircle /> : <Add />
                              }
                              onClick={saveSupplier}
                              sx={{ minWidth: 200 }}
                            >
                              {editingSupplier
                                ? "Salvar Alterações"
                                : "Adicionar Fornecedor"}
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

          {activeView === "orders" && (
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
                    Gestão de Pedidos
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                  label="Buscar pedido"
                  variant="outlined"
                  fullWidth
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="pending">Pendentes</MenuItem>
                  <MenuItem value="shipped">Enviados</MenuItem>
                </Select>
              </Box>

              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                    Pedidos ({filteredSales.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {filteredSales.map((sale) => (
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
                              <Typography
                                variant="subtitle2"
                                color="textSecondary"
                              >
                                #{sale.id.slice(0, 8).toUpperCase()} •{" "}
                                {sale.date?.toLocaleDateString("pt-BR")} (
                                {Math.round(
                                  (new Date() - sale.date) /
                                  (1000 * 60 * 60 * 24)
                                )}{" "}
                                dias atrás)
                              </Typography>
                              <Typography variant="body1" fontWeight="500">
                                {sale.user?.details.fullName ||
                                  "Cliente não identificado"}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {sale.items.length} itens • R${" "}
                                {sale.total.toFixed(2)}
                              </Typography>
                            </Box>
                            <Chip
                              label={sale.shipped ? "Enviado" : "Pendente"}
                              color={sale.shipped ? "success" : "warning"}
                              variant="outlined"
                            />
                            <Button
                              variant="contained"
                              startIcon={<LocalShipping />}
                              onClick={() =>
                                sale.shipped
                                  ? unmarkAsShipped(sale.id)
                                  : markAsShipped(sale.id)
                              }
                              sx={{ borderRadius: 3 }}
                            >
                              {sale.shipped
                                ? "Desmarcar Enviado"
                                : "Marcar como Enviado"}
                            </Button>
                          </Box>

                          <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Typography variant="subtitle2">
                                Detalhes do Pedido
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <Typography variant="h6" sx={{ mb: 2 }}>
                                    Informações do Cliente
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>Nome:</strong>{" "}
                                    {sale.user?.details.fullName || "N/A"}
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>CPF:</strong>{" "}
                                    {sale.user?.details.cpf || "N/A"}
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>Telefone:</strong>{" "}
                                    {sale.user?.details.phone || "N/A"}
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>Endereço:</strong>{" "}
                                    {sale.user?.details.address.street || "N/A"}
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>Número:</strong>{" "}
                                    {sale.user?.details.address.number}
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>bairro:</strong>{" "}
                                    {sale.user?.details.address.
neighborhood}
                                  </Typography>
                                  <Typography variant="body1">
                                    <strong>Cep:</strong>{" "}
                                    {sale.user?.details.address.
zipCode}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="h6" sx={{ mb: 2 }}>
                                    Itens do Pedido
                                  </Typography>
                                  {sale.items.map((item, index) => (
                                    <Box
                                      key={index}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        mb: 2,
                                      }}
                                    >
                                      <Avatar
                                        src={item.imageUrl}
                                        variant="rounded"
                                      />
                                      <Box>
                                        <Typography variant="body1">
                                          {item.name}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          color="textSecondary"
                                        >
                                          Quantidade: {item.quantity} • Preço:
                                          R$ {item.price.toFixed(2)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  ))}
                                </Grid>
                              </Grid>
                            </AccordionDetails>
                          </Accordion>
                          <TextField
                            label="Notas Internas"
                            multiline
                            rows={2}
                            fullWidth
                            value={notes[sale.id] || ""}
                            onChange={(e) =>
                              handleNoteChange(sale.id, e.target.value)
                            }
                            sx={{ mt: 2 }}
                          />
                          <Button
                            startIcon={<Print />}
                            sx={{ mt: 1 }}
                            onClick={() => handlePrintOrder(sale)}
                          >
                            Imprimir
                          </Button>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </>
          )}

          {activeView === "delivered" && (
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
                  <CheckCircle
                    sx={{
                      fontSize: 40,
                      color: theme.palette.success.main,
                      bgcolor: theme.palette.success.light,
                      p: 1.5,
                      borderRadius: 4,
                    }}
                  />
                  <Typography variant="h4" fontWeight="700">
                    Pedidos Entregues
                  </Typography>
                </Box>
              </Box>

              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                    Lista de Pedidos Entregues
                    <Chip
                      label={`${deliveredSales.length} entregues`}
                      size="small"
                      sx={{ ml: 2, bgcolor: "action.selected" }}
                    />
                  </Typography>

                  <Grid container spacing={2}>
                    {deliveredSales.map((sale) => (
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
                              <Typography
                                variant="subtitle2"
                                color="textSecondary"
                              >
                                #{sale.id.slice(0, 8).toUpperCase()} •{" "}
                                {sale.date?.toLocaleDateString("pt-BR")}
                              </Typography>
                              <Typography variant="body1" fontWeight="500">
                                {sale.user?.details.fullName ||
                                  "Cliente não identificado"}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {sale.items.length} itens • R${" "}
                                {sale.total.toFixed(2)}
                              </Typography>
                            </Box>
                            <Chip
                              label="Entregue"
                              color="success"
                              variant="outlined"
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
        {activeView === "reports" && (
          <SalesStockReports sales={sales} products={products} />
        )}
      </Box>
      <Footer />
    </div>
  );
}

export default StockManagement;
