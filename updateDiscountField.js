import { db } from "./src/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function addDiscountToAllProducts() {
  const productsRef = collection(db, "products");
  const snapshot = await getDocs(productsRef);

  snapshot.forEach(async (productDoc) => {
    const data = productDoc.data();
    if (data.discount === undefined) {
      await updateDoc(doc(db, "products", productDoc.id), { discount: 0 });
      console.log(`Produto ${productDoc.id} atualizado com discount: 0`);
    }
  });
}

addDiscountToAllProducts();