// Demo file version 1: Correct e-commerce shopping cart logic (baseline)

function calculateTotal(cartItems, discountCode) {
  let subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = 0;

  if (discountCode === 'SAVE20') {
    discountAmount = subtotal * 0.20;
  } else if (discountCode === 'MINUS10' && subtotal >= 50) {
    discountAmount = 10;
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = afterDiscount * 0.08; // 8% tax rate
  
  return {
    subtotal: subtotal.toFixed(2),
    discount: discountAmount.toFixed(2),
    tax: taxAmount.toFixed(2),
    total: (afterDiscount + taxAmount).toFixed(2)
  };
}

function processOrder(cartItems, userContext) {
  if (!userContext.isAuthenticated || !userContext.hasActivePaymentMethod) {
    throw new Error('User cannot proceed to checkout');
  }

  // Check inventory stock
  const outOfStockItems = cartItems.filter(item => item.requestedQuantity > item.availableStock);
  
  if (outOfStockItems.length > 0) {
    const itemNames = outOfStockItems.map(i => i.name).join(', ');
    throw new Error(`Insufficient stock for items: ${itemNames}`);
  }

  // Deduct inventory
  const finalItems = cartItems.map(item => ({
    ...item,
    availableStock: item.availableStock - item.requestedQuantity
  }));

  return {
    status: 'COMPLETED',
    transactionId: `txn_${Date.now()}`,
    updatedInventory: finalItems
  };
}

module.exports = { calculateTotal, processOrder };
