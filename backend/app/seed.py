from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Category, Product, User
from .security import hash_password

CATEGORIES = [
    {"slug": "electronics", "name": "Electronics", "emoji": "📱"},
    {"slug": "fashion", "name": "Fashion", "emoji": "👕"},
    {"slug": "home", "name": "Home & Living", "emoji": "🏠"},
    {"slug": "beauty", "name": "Beauty", "emoji": "💄"},
    {"slug": "sports", "name": "Sports & Fitness", "emoji": "⚽"},
    {"slug": "accessories", "name": "Accessories", "emoji": "⌚"},
]

# (category_slug, slug, name, brand, description, price, original_price, image, rating, rating_count, stock, featured)
PRODUCTS = [
    # Electronics
    ("electronics", "aurora-pro-14-laptop", "Aurora Pro 14 Laptop", "Aurora", "Ultra-light 14-inch laptop with a 12-core CPU, 16GB RAM and 512GB SSD. Built for programmers and long work sessions.", 58990, 72990, "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80", 4.6, 842, 34, True),
    ("electronics", "nimbus-air-15", "Nimbus Air 15 Laptop", "Nimbus", "Slim 15.6-inch everyday laptop with 8GB RAM, 256GB SSD and a 1080p anti-glare display.", 44990, 52990, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80", 4.3, 511, 52, False),
    ("electronics", "pulse-x-headphones", "Pulse X Wireless Headphones", "Pulse", "Over-ear noise-cancelling headphones with 40-hour battery, deep bass and crystal-clear calls.", 4499, 6499, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", 4.7, 2314, 120, True),
    ("electronics", "pixelbuds-lite", "PixelBuds Lite Earbuds", "Pixel", "True wireless earbuds with active noise cancellation, touch controls and a pocketable charging case.", 3299, 4499, "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80", 4.4, 987, 88, False),
    ("electronics", "apple-iphone", "Apple iPhone", "Apple", "6.8-inch QHD+ flagship smartphone, 200MP camera, 12GB RAM, 256GB storage and all-day battery.", 189999, 210000, "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80", 4.8, 1567, 45, True),
    ("electronics", "sonic-soundbar", "Sonic 2.1 Soundbar", "Sonic", "Powerful 2.1-channel soundbar with wireless subwoofer, Bluetooth 5.3 and 4 EQ presets.", 18500, 22000, "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80", 4.2, 342, 60, False),
    ("electronics", "nexus-4k-monitor", "Nexus 27\" 4K Monitor", "Nexus", "27-inch 4K IPS monitor with 99% sRGB, USB-C 65W charging and height-adjustable stand.", 72000, 85000, "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80", 4.5, 289, 40, False),
    # Fashion
    ("fashion", "men-classic-denim", "Men Classic Denim Jacket", "RawWear", "Timeless straight-fit denim jacket with brass buttons and reinforced stitching.", 4999, 6500, "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=800&q=80", 4.4, 1023, 75, True),
    ("fashion", "women-summer-dress", "Women Summer Floral Dress", "Bloom", "Lightweight midi dress with a floral print, tie waist and breathable cotton blend.", 3899, 5200, "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80", 4.6, 745, 64, True),
    ("fashion", "sneaker-ultra-run", "UltraRun Sneakers", "Stride", "Responsive running sneakers with cloud-foam midsole, breathable knit upper and rubber outsole.", 7999, 9999, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", 4.7, 3120, 150, True),
    ("fashion", "hoodie-essentials", "Essentials Oversized Hoodie", "RawWear", "Soft-brushed 350gsm fleece hoodie with drop shoulders and kangaroo pocket.", 2999, 4200, "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80", 4.3, 890, 95, False),
    ("fashion", "leather-crossbody", "Vintage Leather Crossbody", "Heritage", "Genuine full-grain leather crossbody bag with adjustable strap and antique hardware.", 7499, 9800, "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80", 4.5, 456, 38, False),
    # Home
    ("home", "cozy-throw-blanket", "Cozy Knit Throw Blanket", "HomeWarm", "Chunky-knit 150x200cm throw in a warm neutral tone. Machine washable.", 3499, 4800, "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=800&q=80", 4.6, 623, 110, True),
    ("home", "aroma-essential-diffuser", "Aroma Essential Oil Diffuser", "ZenHome", "Ultrasonic diffuser with 7-colour ambient light, 300ml tank and 8-hour runtime.", 2799, 3800, "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=800&q=80", 4.4, 512, 130, False),
    ("home", "ceramic-vase-set", "Ceramic Vase Set of 3", "HomeWarm", "Hand-glazed ceramic vases in three heights. Perfect for dried or fresh flowers.", 2299, 3200, "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80", 4.2, 187, 90, False),
    ("home", "desk-lamp-led", "Nordic LED Desk Lamp", "Lumen", "Dimmable LED desk lamp with USB-C charging port, 3 colour temps and memory function.", 4499, 5999, "https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80", 4.5, 398, 72, False),
    # Beauty
    ("beauty", "vitamin-c-serum", "Vitamin C Brightening Serum", "GlowLab", "10% vitamin C + hyaluronic acid serum for radiant, even-toned skin. Dermatologist tested.", 2499, 3400, "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80", 4.6, 1456, 200, True),
    ("beauty", "hydra-moisturizer", "Hydra 72h Moisturizer", "GlowLab", "Lightweight gel-cream moisturizer with 72-hour hydration and ceramide complex.", 1999, 2800, "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80", 4.5, 980, 180, False),
    ("beauty", "matte-lipstick", "Velvet Matte Lipstick", "Velour", "Creamy matte lipstick with all-day wear and a hint of shea butter.", 1299, 1900, "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80", 4.3, 2105, 260, False),
    ("beauty", "perfume-oasis", "Oasis Eau de Parfum 50ml", "Aroma", "Fresh citrus and white floral fragrance with a warm amber base. 50ml spray.", 7999, 10500, "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80", 4.7, 667, 55, True),
    # Sports
    ("sports", "yoga-mat-pro", "ProGrip Yoga Mat 6mm", "FlexCo", "Eco-friendly TPE mat with alignment lines, carrying strap and superior grip.", 3499, 4700, "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800&q=80", 4.5, 743, 140, True),
    ("sports", "dumbbell-set-20kg", "20kg Adjustable Dumbbell Set", "IronFlex", "Space-saving adjustable dumbbells from 2.5kg to 20kg with secure locking.", 24999, 32000, "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=800&q=80", 4.6, 234, 25, False),
    ("sports", "smart-fitness-band", "SmartFit Band 7", "FlexCo", "1.62\" AMOLED fitness band with heart-rate, SpO2, 120 sport modes and 14-day battery.", 4499, 6499, "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&q=80", 4.4, 1876, 160, False),
    ("sports", "resistance-bands-set", "Resistance Bands Set (5-pack)", "IronFlex", "Five colour-coded latex bands from 5 to 50 lbs with door anchor and handles.", 1899, 2600, "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80", 4.3, 654, 210, False),
    # Accessories
    ("accessories", "smart-watch-pro", "SmartWatch Pro GPS", "Timelab", "46mm smartwatch with GPS, 100+ watch faces, sleep tracking and 10-day battery.", 18999, 24000, "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80", 4.6, 1234, 68, True),
    ("accessories", "wireless-charging-pad", "MagSafe Wireless Charging Pad", "Volt", "15W fast wireless charging pad with foldable stand for phone and earbuds.", 3499, 4999, "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&q=80", 4.4, 803, 145, False),
    ("accessories", "leather-wallet", "Slim Leather Wallet", "Heritage", "Minimalist bifold wallet with RFID blocking and 8 card slots.", 1999, 2900, "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80", 4.5, 321, 100, False),
    ("accessories", "sunglasses-polarized", "Aviator Polarized Sunglasses", "Skyline", "Classic aviator with UV400 polarized lenses and lightweight metal frame.", 3599, 4800, "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80", 4.6, 456, 85, False),
    # Electronics (batch 2)
    ("electronics", "ultrabook-pro-16", "UltraBook Pro 16 OLED", "Aurora", "16-inch 3K OLED ultrabook with 32GB RAM, 1TB SSD and a 99Wh battery. Creator-grade colour accuracy.", 199999, 230000, "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80", 4.8, 203, 18, True),
    ("electronics", "rgb-mech-keyboard", "RGB Mechanical Gaming Keyboard", "Pulse", "Hot-swappable TKL keyboard with per-key RGB, gasket mount and PBT keycaps.", 12999, 16999, "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&q=80", 4.6, 512, 80, False),
    ("electronics", "4k-stream-webcam", "4K Ultra HD Streaming Webcam", "Nexus", "4K webcam with autofocus, dual noise-cancelling mics and privacy shutter.", 8999, 12000, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80", 4.3, 287, 95, False),
    ("electronics", "portable-ssd-1tb", "Portable SSD 1TB USB-C", "Volt", "Pocket-size 1TB SSD with 1050MB/s read speeds, IP55 rating and 3-year warranty.", 24999, 32000, "https://images.unsplash.com/photo-1618410320928-25228d811631?w=800&q=80", 4.7, 934, 60, False),
    ("electronics", "smart-tv-50-4k", "50\" 4K QLED Smart TV", "Sonic", "50-inch 4K QLED with HDR10+, Dolby Atmos soundbar mode and voice remote.", 189999, 220000, "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80", 4.5, 412, 22, True),
    # Fashion (batch 2)
    ("fashion", "men-oxford-shirt", "Men Slim-Fit Oxford Shirt", "RawWear", "Breathable cotton-oxford slim-fit shirt with cutaway collar and mother-of-pearl buttons.", 3499, 4600, "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80", 4.4, 512, 120, False),
    ("fashion", "women-chunky-cardigan", "Women Chunky Knit Cardigan", "Bloom", "Oversized chunky-knit cardigan in a soft wool blend with drop shoulders.", 4599, 6200, "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80", 4.6, 378, 70, False),
    ("fashion", "canvas-sneakers-classic", "Classic Canvas Sneakers", "Stride", "Everyday low-top canvas sneakers with cushioned insole and vulcanised sole.", 2999, 3999, "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80", 4.5, 1102, 150, True),
    ("fashion", "women-denim-shorts", "Women High-Waist Denim Shorts", "Bloom", "High-rise stretch denim shorts with frayed hem and five-pocket styling.", 2699, 3500, "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=800&q=80", 4.3, 445, 110, False),
    ("fashion", "insulated-puffer-jacket", "Insulated Puffer Jacket", "RawWear", "Water-repellent puffer with recycled insulation, zippered pockets and hood.", 8999, 11999, "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80", 4.7, 689, 55, True),
    # Home & Living (batch 2)
    ("home", "memory-foam-pillow", "Memory Foam Contour Pillow", "HomeWarm", "Cooling-gel memory foam pillow with adjustable loft and washable cover.", 3499, 4900, "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80", 4.6, 823, 140, False),
    ("home", "drip-coffee-maker", "12-Cup Drip Coffee Maker", "Brewio", "Programmable coffee maker with 24h timer, glass carafe and pause-and-serve.", 12999, 16000, "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80", 4.4, 356, 45, False),
    ("home", "smart-bulb-4pack", "Smart LED Bulb Set (4-Pack)", "Volt", "Wi-Fi smart bulbs with 16M colours, scheduling and voice assistant support.", 3999, 5499, "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80", 4.5, 601, 130, False),
    ("home", "mid-century-plant-stand", "Mid-Century Plant Stand", "HomeWarm", "Solid rubberwood plant stand with two tiers and a natural lacquer finish.", 2799, 3700, "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80", 4.4, 214, 85, False),
    ("home", "electric-kettle-1-7l", "1.7L Stainless Electric Kettle", "Brewio", "Fast-boil 2200W kettle with auto shut-off, concealed element and cool-touch handle.", 3499, 4500, "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80", 4.6, 732, 160, False),
    # Beauty (batch 2)
    ("beauty", "sunscreen-spf50", "SPF50+ Sunscreen Gel", "GlowLab", "Non-greasy broad-spectrum SPF50+ gel with niacinamide, invisible on all skin tones.", 1799, 2400, "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80", 4.6, 1112, 220, True),
    ("beauty", "ionic-hair-straightener", "Ionic Ceramic Hair Straightener", "GlossUp", "Titanium plates, 30s heat-up, 5 temperature settings and auto shut-off.", 5499, 7200, "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80", 4.4, 498, 75, False),
    ("beauty", "retinol-eye-serum", "Retinol Eye Serum", "GlowLab", "Encapsulated retinol + caffeine eye serum to firm and brighten under-eyes.", 2599, 3400, "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80", 4.5, 623, 140, False),
    ("beauty", "foaming-face-wash", "Foaming Gel Face Wash", "GlowLab", "Gentle pH-balanced foaming cleanser with salicylic acid for daily use.", 1499, 2100, "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80", 4.5, 1345, 250, False),
    # Sports & Fitness (batch 2)
    ("sports", "foldable-home-treadmill", "Foldable Home Treadmill", "IronFlex", "Quiet 2.5HP treadmill with 12 incline levels, Bluetooth and fold-away deck.", 159999, 190000, "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80", 4.7, 168, 12, True),
    ("sports", "speed-skipping-rope", "Speed Skipping Rope", "FlexCo", "Ball-bearing speed rope with adjustable steel cable and ergonomic grips.", 899, 1400, "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", 4.5, 2210, 300, False),
    ("sports", "kettlebell-12kg", "12kg Cast Iron Kettlebell", "IronFlex", "Powder-coated cast iron kettlebell with flat base and wide handle.", 5999, 7800, "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80", 4.6, 342, 60, False),
    ("sports", "padded-cycling-gloves", "Padded Cycling Gloves", "FlexCo", "Breathable half-finger gloves with gel padding, touchscreen tips and pull tabs.", 1299, 1900, "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80", 4.4, 489, 180, False),
    # Accessories (batch 2)
    ("accessories", "power-bank-20000", "20000mAh Fast Charge Power Bank", "Volt", "22.5W fast-charge power bank with dual USB-C and LED digital display.", 4999, 6999, "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80", 4.7, 1567, 200, True),
    ("accessories", "bluetooth-speaker", "Portable Bluetooth Speaker", "Pulse", "IPX7 waterproof speaker with 24h battery, stereo pairing and strap.", 6499, 8999, "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80", 4.6, 987, 110, False),
]

ADMIN = {"name": "ShopVerse Admin", "email": "admin@shopverse.com", "password": "admin123"}


def seed(db: Session) -> None:
    if db.scalar(select(Category).limit(1)) is not None:
        return

    categories: dict[str, Category] = {}
    for c in CATEGORIES:
        category = Category(**c)
        db.add(category)
        categories[c["slug"]] = category
    db.flush()

    for (cat_slug, slug, name, brand, desc, price, original, image, rating, rating_count, stock, featured) in PRODUCTS:
        db.add(
            Product(
                slug=slug,
                name=name,
                brand=brand,
                description=desc,
                price=price,
                original_price=original,
                image_url=image,
                rating=rating,
                rating_count=rating_count,
                stock=stock,
                featured=featured,
                category_id=categories[cat_slug].id,
            )
        )

    if db.scalar(select(User).where(User.email == ADMIN["email"])) is None:
        db.add(
            User(
                name=ADMIN["name"],
                email=ADMIN["email"],
                hashed_password=hash_password(ADMIN["password"]),
                is_admin=True,
            )
        )

    db.commit()