import React from 'react';
import { FiX, FiTrash, FiHeart, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useCart } from 'react-use-cart';
import storeStyles from '../pages/store/store.module.css';

export default function CartModal({ open, onClose, onCheckout }) {
  const { items, cartTotal, removeItem, updateItemQuantity, emptyCart } = useCart();
  const navigate = useNavigate();

  const subTotal = items.reduce((total, item) => {
    const originalPrice = item.oldPrice && item.oldPrice > item.price ? item.oldPrice : item.price;
    return total + originalPrice * item.quantity;
  }, 0);

  const totalDiscount = subTotal - (cartTotal || 0);
const getColorName = (color) => {
  if (!color) return '';

  // Caso seja array: [{ hex, name }]
  if (Array.isArray(color)) {
    return color[0]?.name ?? '';
  }

  // Caso seja objeto: { hex, name }
  if (typeof color === 'object') {
    return color.name ?? '';
  }

  // Caso seja string
  return color;
};

  if (!open) return null;

  return (
    <div>
      <div className={`${storeStyles.overlay} ${open ? storeStyles.open : ''}`} onClick={onClose} />
      <div className={`${storeStyles.cartModal} ${open ? storeStyles.open : ''}`} aria-hidden={!open}>
        <div className={storeStyles.cartContent}>
          <div className={storeStyles.cartHeader}>
            <h2 className={storeStyles.cartTitle}>Seu Carrinho</h2>
            <button className={storeStyles.closeCartButton} onClick={onClose} aria-label="Fechar carrinho">
              <FiX size={24} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className={storeStyles.cartEmpty}>
              <FiHeart size={48} />
              <p>Seu carrinho esta vazio</p>
            </div>
          ) : (
            <>
              <div className={storeStyles.cartItems}>
                {items.map(item => (
                  <div key={item.id} className={storeStyles.cartItem}>
                    <img
                      src={item.imageUrls?.[0]}
                      alt={item.name}
                      className={storeStyles.cartItemImage}
                    />
                    <div className={storeStyles.cartItemDetails}>
                      <h3 className={storeStyles.cartItemName}>{item.name}</h3>
                      <div className={storeStyles.cartItemVariation}>
                        {/* {item.variation?.color && <span>Cor: {item.variation.color.name}</span>} */}
                        <div>

                          {item.variation?.color && (
                            <span>
                              Cor: {getColorName(item.variation.color)}
                            </span>
                          )}
                        </div>

                        {item.variation?.size && <span style={{ marginLeft: 8 }}>Tamanho: {item.variation.size}</span>}
                      </div>
                      <div className={storeStyles.cartItemPrice}>
                        R$ {Number(item.price).toFixed(2)}
                      </div>
                      <div className={storeStyles.quantityControls}>
                        <button
                          className={storeStyles.quantityButton}
                          onClick={() => updateItemQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          -
                        </button>
                        <span className={storeStyles.quantityValue}>{item.quantity}</span>
                        <button
                          className={storeStyles.quantityButton}
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className={storeStyles.removeItemButton}
                      onClick={() => removeItem(item.id)}
                      aria-label="Remover item"
                    >
                      <FiTrash size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={storeStyles.cartSummary}>
                {totalDiscount > 0 && (
                  <div className={storeStyles.totalContainer}>
                    <div className={storeStyles.totalRow}>
                      <span className={storeStyles.totalLabel}>Subtotal</span>
                      <span className={storeStyles.totalPrice}>R$ {subTotal.toFixed(2)}</span>
                    </div>
                    <div className={`${storeStyles.totalRow} ${storeStyles.discountRow}`}>
                      <span className={storeStyles.totalLabel}>Descontos</span>
                      <span className={storeStyles.totalPrice}>- R$ {totalDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className={storeStyles.totalContainer}>
                  <div className={storeStyles.totalRow}>
                    <span className={storeStyles.totalLabel}>Total</span>
                    <span className={storeStyles.totalPrice}>R$ {(cartTotal || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                

                  <button
                    className={storeStyles.checkoutButton}
                    onClick={() => {
                      onClose();
                      if (onCheckout) onCheckout();
                      else navigate('/checkout');
                    }}
                    disabled={items.length === 0}
                  >
                    Finalizar Compra <FiChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}