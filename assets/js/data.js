// ===== tiao — product catalogue =====
// Placeholder inventory. Each product: id, category, brand, name, price,
// condition, badge, img. Swap in real photos/prices when inventory is ready.
window.TIAO_PRODUCTS = [
  /* ---------------- BAGS ---------------- */
  { id: 'b1', category: 'bags', brand: 'SAINT LAURENT', name: 'Loulou Medium Quilted Leather', price: 1980, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80' },
  { id: 'b2', category: 'bags', brand: 'CHANEL', name: 'Classic Flap Medium Caviar', price: 8900, condition: 'Pre-Owned · Excellent', badge: 'AUTHENTICATED', img: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=600&q=80' },
  { id: 'b3', category: 'bags', brand: 'OFF-WHITE', name: 'Binder Clip Jitney Bag', price: 1240, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=600&q=80' },
  { id: 'b4', category: 'bags', brand: 'LOUIS VUITTON', name: 'Neverfull MM Monogram Tote', price: 1650, condition: 'Pre-Owned · Very Good', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80' },
  { id: 'b5', category: 'bags', brand: 'DIOR', name: 'Saddle Bag Oblique Canvas', price: 2450, condition: 'Pre-Owned · Very Good', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=600&q=80' },
  { id: 'b6', category: 'bags', brand: 'HERMÈS', name: 'Kelly 28 Togo Leather', price: 21500, condition: 'Pre-Owned · Pristine', badge: 'AUTHENTICATED', img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&q=80' },
  { id: 'b7', category: 'bags', brand: 'GUCCI', name: 'GG Marmont Small Shoulder', price: 1290, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1601369447149-9b6a0b0b1a52?auto=format&fit=crop&w=600&q=80' },
  { id: 'b8', category: 'bags', brand: 'PRADA', name: 'Re-Edition 2005 Nylon', price: 1150, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=600&q=80' },
  { id: 'b9', category: 'bags', brand: 'BOTTEGA VENETA', name: 'Jodie Mini Intrecciato', price: 2680, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1614179689702-355944cd0918?auto=format&fit=crop&w=600&q=80' },
  { id: 'b10', category: 'bags', brand: 'BALENCIAGA', name: 'Hourglass Small Top Handle', price: 1990, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1591348122449-02525d70379b?auto=format&fit=crop&w=600&q=80' },

  /* ---------------- SHOES ---------------- */
  { id: 's1', category: 'shoes', brand: 'NIKE × OFF-WHITE', name: 'Air Jordan 1 "The Ten"', price: 2200, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80' },
  { id: 's2', category: 'shoes', brand: 'BALENCIAGA', name: 'Triple S Trainers Grey', price: 720, condition: 'Brand New · Boxed', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80' },
  { id: 's3', category: 'shoes', brand: 'YEEZY', name: 'Boost 350 V2 "Zebra"', price: 340, condition: 'Brand New · Boxed', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80' },
  { id: 's4', category: 'shoes', brand: 'DIOR', name: 'B23 High-Top Oblique', price: 980, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80' },
  { id: 's5', category: 'shoes', brand: 'CHRISTIAN LOUBOUTIN', name: 'So Kate 120 Patent', price: 640, condition: 'Pre-Owned · Very Good', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80' },
  { id: 's6', category: 'shoes', brand: 'NIKE', name: 'Dunk Low "Panda"', price: 180, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1600269452121-4f11c6b8f4a9?auto=format&fit=crop&w=600&q=80' },
  { id: 's7', category: 'shoes', brand: 'NEW BALANCE', name: '550 White Green', price: 210, condition: 'Brand New · Boxed', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=600&q=80' },
  { id: 's8', category: 'shoes', brand: 'GUCCI', name: 'Rhyton Logo Leather', price: 720, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80' },

  /* ---------------- WATCHES ---------------- */
  { id: 'w1', category: 'watches', brand: 'ROLEX', name: 'Datejust 41 Oyster Steel', price: 9850, condition: 'Verified · Full Set', badge: 'AUTHENTICATED', img: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=600&q=80' },
  { id: 'w2', category: 'watches', brand: 'AUDEMARS PIGUET', name: 'Royal Oak 41 Steel', price: 42500, condition: 'Verified · Full Set', badge: 'AUTHENTICATED', img: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=600&q=80' },
  { id: 'w3', category: 'watches', brand: 'PATEK PHILIPPE', name: 'Nautilus 5711 Blue Dial', price: 98000, condition: 'Verified · Full Set', badge: 'AUTHENTICATED', img: 'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?auto=format&fit=crop&w=600&q=80' },
  { id: 'w4', category: 'watches', brand: 'OMEGA', name: 'Speedmaster Moonwatch', price: 5400, condition: 'Verified · Full Set', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=600&q=80' },
  { id: 'w5', category: 'watches', brand: 'CARTIER', name: 'Santos Medium Steel', price: 6200, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80' },
  { id: 'w6', category: 'watches', brand: 'ROLEX', name: 'Submariner Date Black', price: 14200, condition: 'Verified · Full Set', badge: 'AUTHENTICATED', img: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=600&q=80' },

  /* ---------------- ACCESSORIES ---------------- */
  { id: 'a1', category: 'accessories', brand: 'GUCCI', name: 'GG Marmont Leather Belt', price: 420, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=600&q=80' },
  { id: 'a2', category: 'accessories', brand: 'SAINT LAURENT', name: 'Monogram Cardholder', price: 260, condition: 'Brand New · Boxed', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80' },
  { id: 'a3', category: 'accessories', brand: 'CHANEL', name: 'CC Logo Sunglasses', price: 540, condition: 'Pre-Owned · Excellent', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80' },
  { id: 'a4', category: 'accessories', brand: 'HERMÈS', name: 'Silk Twill Scarf 90cm', price: 480, condition: 'Brand New · Boxed', badge: 'NEW IN', isNew: true, img: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=600&q=80' },
  { id: 'a5', category: 'accessories', brand: 'LOUIS VUITTON', name: 'Monogram Bracelet', price: 390, condition: 'Pre-Owned · Very Good', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80' },
  { id: 'a6', category: 'accessories', brand: 'DIOR', name: 'CD Icon Baseball Cap', price: 380, condition: 'Brand New · Boxed', badge: 'ON HAND', img: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80' }
];

// Brand lists per category — used to build the brand filter bars.
window.TIAO_BRANDS = {
  bags: ['SAINT LAURENT', 'OFF-WHITE', 'CHANEL', 'LOUIS VUITTON', 'DIOR', 'HERMÈS', 'GUCCI', 'PRADA', 'BOTTEGA VENETA', 'BALENCIAGA'],
  shoes: ['NIKE × OFF-WHITE', 'NIKE', 'BALENCIAGA', 'YEEZY', 'DIOR', 'CHRISTIAN LOUBOUTIN', 'NEW BALANCE', 'GUCCI'],
  watches: ['ROLEX', 'AUDEMARS PIGUET', 'PATEK PHILIPPE', 'OMEGA', 'CARTIER'],
  accessories: ['GUCCI', 'SAINT LAURENT', 'CHANEL', 'HERMÈS', 'LOUIS VUITTON', 'DIOR']
};
