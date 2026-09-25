"""
Seed the database with realistic development data for Velmora Kids.
Run: python -m seed
"""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, async_engine, Base
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.product import (
    Category, Brand, Collection, Size, Color, Product, ProductVariant,
    ProductImage, Gender, ProductStatus,
)
from app.models.inventory import (
    Warehouse, WarehouseLocation, Inventory, InventoryMovement,
    MovementType, Supplier, Purchase, PurchaseItem, PurchaseStatus,
)
from app.models.order import Order, OrderItem, Payment, OrderStatus, PaymentMethod, PaymentStatus, TransactionStatus
from app.models.crm import CustomerProfile, CustomerAddress, CRMLead, CRMActivity, CRMStatus, LeadStatus, LeadPriority
from app.models.content import (
    Cart, Favorite, Review, ProductQuestion, Banner, Promotion,
    Notification, AuditLog, DiscountType, PromotionAppliesTo,
)


async def seed():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("Seeding users...")
        users = await seed_users(db)
        print("Seeding categories...")
        categories = await seed_categories(db)
        print("Seeding brands...")
        brands = await seed_brands(db)
        print("Seeding sizes...")
        sizes = await seed_sizes(db)
        print("Seeding colors...")
        colors = await seed_colors(db)
        print("Seeding collections...")
        collections = await seed_collections(db)
        print("Seeding products...")
        products = await seed_products(db, categories, brands, collections, sizes, colors)
        print("Seeding warehouse & inventory...")
        warehouse = await seed_warehouse(db, products, users)
        print("Seeding suppliers...")
        suppliers = await seed_suppliers(db)
        print("Seeding customers...")
        customers = await seed_customers(db, users)
        print("Seeding orders...")
        await seed_orders(db, users, products, customers)
        print("Seeding CRM data...")
        await seed_crm(db, users, products, customers)
        print("Seeding content...")
        await seed_content(db, users, products)
        print("Seeding banners...")
        await seed_banners(db)

        await db.commit()
        print("Seed complete!")


async def seed_users(db: AsyncSession) -> dict:
    users = {}
    dev_admin = User(
        email="abdulloh@velmora.uz",
        phone="+998900000001",
        hashed_password=hash_password("a20662006b"),
        first_name="Abdulloh",
        last_name="Developer",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(dev_admin)
    await db.flush()
    users["dev_admin"] = dev_admin

    user_data = [
        ("admin@velmora.uz", "Abdulloh", "Karimov", UserRole.SUPER_ADMIN, "+998901234567"),
        ("director@velmora.uz", "Dilshod", "Rahimov", UserRole.DIRECTOR, "+998901234568"),
        ("seller1@velmora.uz", "Nodira", "Usmanova", UserRole.SELLER, "+998901234569"),
        ("seller2@velmora.uz", "Jasur", "Toshmatov", UserRole.SELLER, "+998901234570"),
        ("cc1@velmora.uz", "Malika", "Saidova", UserRole.CALL_CENTER, "+998901234571"),
        ("cc2@velmora.uz", "Sardor", "Alimov", UserRole.CALL_CENTER, "+998901234572"),
        ("customer1@mail.uz", "Zarina", "Kamilova", UserRole.CUSTOMER, "+998901234573"),
        ("customer2@mail.uz", "Behruz", "Nazarov", UserRole.CUSTOMER, "+998901234574"),
        ("customer3@mail.uz", "Gulnora", "Yusupova", UserRole.CUSTOMER, "+998901234575"),
        ("customer4@mail.uz", "Timur", "Ergashev", UserRole.CUSTOMER, "+998901234576"),
        ("customer5@mail.uz", "Shahlo", "Mirzayeva", UserRole.CUSTOMER, "+998901234577"),
    ]
    for email, first, last, role, phone in user_data:
        user = User(
            email=email,
            phone=phone,
            hashed_password=hash_password("password123"),
            first_name=first,
            last_name=last,
            role=role,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        users[role.value if role != UserRole.CUSTOMER else f"customer_{email}"] = user
    return users


async def seed_categories(db: AsyncSession) -> dict:
    cats = {}
    root_data = [
        ("Девочки", "devochki", "girls"),
        ("Мальчики", "malchiki", "boys"),
        ("Новорожденные", "novorozhdennye", "newborn"),
        ("Аксессуары", "aksessuary", "accessories"),
        ("Распродажа", "rasprodazha", "sale"),
    ]
    for name, slug, key in root_data:
        cat = Category(name=name, name_ru=name, slug=slug, is_active=True, sort_order=root_data.index((name, slug, key)))
        db.add(cat)
        await db.flush()
        cats[key] = cat

    sub_data = [
        ("Платья", "platya", "girls", "dresses"),
        ("Юбки", "yubki", "girls", "skirts"),
        ("Куртки", "kurtki-devochki", "girls", "girls_jackets"),
        ("Комплекты", "komplekty-devochki", "girls", "girls_sets"),
        ("Рубашки", "rubashki", "boys", "shirts"),
        ("Брюки", "bryuki", "boys", "pants"),
        ("Куртки", "kurtki-malchiki", "boys", "boys_jackets"),
        ("Костюмы", "kostyumy", "boys", "suits"),
        ("Боди", "bodi", "newborn", "bodysuits"),
        ("Комбинезоны", "kombinezony", "newborn", "rompers"),
        ("Конверты", "konverty", "newborn", "envelopes"),
        ("Наборы", "nabory-novorozhdennye", "newborn", "newborn_sets"),
    ]
    for name, slug, parent_key, key in sub_data:
        cat = Category(
            name=name, name_ru=name, slug=slug,
            parent_id=cats[parent_key].id, is_active=True,
        )
        db.add(cat)
        await db.flush()
        cats[key] = cat
    return cats


async def seed_brands(db: AsyncSession) -> dict:
    brands = {}
    data = [
        ("Velmora", "velmora"),
        ("Petit Soleil", "petit-soleil"),
        ("Mimi & Lulu", "mimi-lulu"),
        ("Little Lord", "little-lord"),
        ("Nord Baby", "nord-baby"),
    ]
    for name, slug in data:
        brand = Brand(name=name, slug=slug, is_active=True)
        db.add(brand)
        await db.flush()
        brands[slug] = brand
    return brands


async def seed_sizes(db: AsyncSession) -> dict:
    sizes = {}
    for i, name in enumerate(["56", "62", "68", "74", "80", "86", "92", "98", "104", "110", "116", "122", "128", "134", "140"]):
        size = Size(name=name, sort_order=i, size_type="children")
        db.add(size)
        await db.flush()
        sizes[name] = size
    return sizes


async def seed_colors(db: AsyncSession) -> dict:
    colors = {}
    data = [
        ("Белый", "#FFFFFF", "white"),
        ("Кремовый", "#FDF8F4", "cream"),
        ("Розовый", "#F9C4D2", "pink"),
        ("Пудровый", "#F2D4D7", "powder"),
        ("Лавандовый", "#E6E6FA", "lavender"),
        ("Голубой", "#B0D4E8", "blue"),
        ("Тёмно-синий", "#1B2A4A", "navy"),
        ("Бежевый", "#D4C5A9", "beige"),
        ("Горчичный", "#C9A96E", "mustard"),
        ("Оливковый", "#708238", "olive"),
        ("Бордовый", "#722F37", "burgundy"),
        ("Серый", "#9C9589", "gray"),
        ("Молочный", "#FFFAF0", "milk"),
    ]
    for name, hex_code, key in data:
        color = Color(name=name, name_ru=name, hex_code=hex_code, is_active=True)
        db.add(color)
        await db.flush()
        colors[key] = color
    return colors


async def seed_collections(db: AsyncSession) -> dict:
    colls = {}
    data = [
        ("Осень-Зима 2026", "osen-zima-2026"),
        ("Весна-Лето 2027", "vesna-leto-2027"),
        ("Праздничная коллекция", "prazdnichnaya-kollekciya"),
    ]
    for name, slug in data:
        coll = Collection(name=name, name_ru=name, slug=slug, is_active=True)
        db.add(coll)
        await db.flush()
        colls[slug] = coll
    return colls


async def seed_products(db, categories, brands, collections, sizes, colors) -> list:
    products = []
    product_data = [
        {
            "name": "Платье из органического хлопка с вышивкой",
            "slug": "plate-iz-organicheskogo-hlopka",
            "sku": "VK-DR-001",
            "brand": "velmora",
            "category": "dresses",
            "collection": "osen-zima-2026",
            "gender": Gender.GIRLS,
            "purchase_price": 180000,
            "selling_price": 489000,
            "discount_percent": 25,
            "discount_price": 366750,
            "material": "100% органический хлопок",
            "sizes": ["92", "98", "104", "110"],
            "colors": ["pink", "cream"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
            "is_bestseller": True,
            "is_new": False,
        },
        {
            "name": "Льняная рубашка с воротником-стойкой",
            "slug": "lnyanaya-rubashka",
            "sku": "VK-SH-002",
            "brand": "petit-soleil",
            "category": "shirts",
            "collection": "osen-zima-2026",
            "gender": Gender.BOYS,
            "purchase_price": 120000,
            "selling_price": 329000,
            "material": "100% лён",
            "sizes": ["104", "110", "116"],
            "colors": ["white", "blue"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
            "is_new": True,
        },
        {
            "name": "Кашемировый комбинезон для новорожденных",
            "slug": "kashemirovyy-kombinezon",
            "sku": "VK-NB-003",
            "brand": "velmora",
            "category": "rompers",
            "gender": Gender.UNISEX,
            "purchase_price": 280000,
            "selling_price": 720000,
            "material": "70% хлопок, 30% кашемир",
            "sizes": ["56", "62", "68"],
            "colors": ["cream", "milk"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
            "is_bestseller": True,
        },
        {
            "name": "Вельветовые брюки с высокой посадкой",
            "slug": "velvetovye-bryuki",
            "sku": "VK-PT-004",
            "brand": "mimi-lulu",
            "category": "skirts",
            "gender": Gender.GIRLS,
            "purchase_price": 140000,
            "selling_price": 385000,
            "discount_percent": 20,
            "discount_price": 308000,
            "material": "98% хлопок, 2% эластан",
            "sizes": ["104", "110", "116"],
            "colors": ["burgundy", "beige"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
        },
        {
            "name": "Шерстяной кардиган с жемчужными пуговицами",
            "slug": "sherstyanoy-kardigan",
            "sku": "VK-KN-005",
            "brand": "velmora",
            "category": "girls_sets",
            "gender": Gender.GIRLS,
            "purchase_price": 200000,
            "selling_price": 560000,
            "material": "100% мериносовая шерсть",
            "sizes": ["98", "104", "110"],
            "colors": ["powder", "cream"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Хлопковый костюм-тройка",
            "slug": "hlopkovyy-kostyum-troyka",
            "sku": "VK-ST-006",
            "brand": "little-lord",
            "category": "suits",
            "collection": "prazdnichnaya-kollekciya",
            "gender": Gender.BOYS,
            "purchase_price": 350000,
            "selling_price": 890000,
            "discount_percent": 20,
            "discount_price": 712000,
            "material": "95% хлопок, 5% эластан",
            "sizes": ["110", "116", "122"],
            "colors": ["navy", "gray"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
            "is_bestseller": True,
        },
        {
            "name": "Муслиновый конверт на выписку",
            "slug": "muslinovyy-konvert",
            "sku": "VK-NB-007",
            "brand": "velmora",
            "category": "envelopes",
            "gender": Gender.UNISEX,
            "purchase_price": 150000,
            "selling_price": 450000,
            "material": "100% органический муслин",
            "sizes": ["56"],
            "colors": ["white", "cream"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Утеплённая куртка с капюшоном",
            "slug": "uteplennaya-kurtka",
            "sku": "VK-JK-008",
            "brand": "nord-baby",
            "category": "girls_jackets",
            "collection": "osen-zima-2026",
            "gender": Gender.UNISEX,
            "purchase_price": 300000,
            "selling_price": 780000,
            "discount_percent": 20,
            "discount_price": 624000,
            "material": "Верх: нейлон. Утеплитель: пух/перо 90/10",
            "sizes": ["104", "110", "116", "122"],
            "colors": ["olive", "navy"],
            "status": ProductStatus.ACTIVE,
        },
        {
            "name": "Трикотажное платье с рюшами",
            "slug": "trikotazhnoe-plate",
            "sku": "VK-DR-009",
            "brand": "mimi-lulu",
            "category": "dresses",
            "gender": Gender.GIRLS,
            "purchase_price": 140000,
            "selling_price": 415000,
            "material": "95% хлопок, 5% эластан",
            "sizes": ["92", "98", "104"],
            "colors": ["lavender", "pink"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Шерстяной свитер Fair Isle",
            "slug": "sherstyanoy-sviter-fair-isle",
            "sku": "VK-KN-010",
            "brand": "nord-baby",
            "category": "shirts",
            "collection": "osen-zima-2026",
            "gender": Gender.BOYS,
            "purchase_price": 190000,
            "selling_price": 520000,
            "material": "80% мериносовая шерсть, 20% нейлон",
            "sizes": ["104", "110", "116"],
            "colors": ["beige", "gray"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Бамбуковый боди-набор (3 шт)",
            "slug": "bambukovyy-bodi-nabor",
            "sku": "VK-NB-011",
            "brand": "velmora",
            "category": "bodysuits",
            "gender": Gender.UNISEX,
            "purchase_price": 110000,
            "selling_price": 350000,
            "material": "70% бамбуковое волокно, 30% органический хлопок",
            "sizes": ["56", "62", "68"],
            "colors": ["milk", "cream"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Вельветовый комбинезон с подтяжками",
            "slug": "velvetovyy-kombinezon-podtyazhki",
            "sku": "VK-OV-012",
            "brand": "little-lord",
            "category": "pants",
            "gender": Gender.BOYS,
            "purchase_price": 160000,
            "selling_price": 445000,
            "material": "100% хлопковый вельвет",
            "sizes": ["92", "98", "104"],
            "colors": ["mustard", "olive"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Плиссированная юбка из тюля",
            "slug": "plissirovannaya-yubka",
            "sku": "VK-SK-013",
            "brand": "mimi-lulu",
            "category": "skirts",
            "collection": "prazdnichnaya-kollekciya",
            "gender": Gender.GIRLS,
            "purchase_price": 95000,
            "selling_price": 295000,
            "material": "Подкладка: хлопок. Верх: полиэстер тюль",
            "sizes": ["92", "98", "104", "110"],
            "colors": ["lavender", "pink", "cream"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Флисовый джемпер с вышивкой",
            "slug": "flisovyy-dzhemper",
            "sku": "VK-FL-014",
            "brand": "nord-baby",
            "category": "shirts",
            "gender": Gender.UNISEX,
            "purchase_price": 90000,
            "selling_price": 275000,
            "material": "100% органический флис",
            "sizes": ["92", "98", "104", "110"],
            "colors": ["milk", "beige"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Хлопковый комплект «Маленький путешественник»",
            "slug": "komplekt-malenkiy-puteshestvennik",
            "sku": "VK-SET-015",
            "brand": "petit-soleil",
            "category": "suits",
            "gender": Gender.BOYS,
            "purchase_price": 130000,
            "selling_price": 395000,
            "material": "100% хлопок",
            "sizes": ["98", "104", "110"],
            "colors": ["olive", "beige"],
            "status": ProductStatus.ACTIVE,
        },
        {
            "name": "Кашемировая шапочка и пинетки (набор)",
            "slug": "kashemirovaya-shapochka-pinetki",
            "sku": "VK-NB-016",
            "brand": "velmora",
            "category": "newborn_sets",
            "gender": Gender.UNISEX,
            "purchase_price": 100000,
            "selling_price": 320000,
            "material": "100% кашемир",
            "sizes": ["56", "62"],
            "colors": ["cream", "white", "pink"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Праздничное платье с пайетками",
            "slug": "prazdnichnoe-plate-payetki",
            "sku": "VK-DR-017",
            "brand": "mimi-lulu",
            "category": "dresses",
            "collection": "prazdnichnaya-kollekciya",
            "gender": Gender.GIRLS,
            "purchase_price": 250000,
            "selling_price": 750000,
            "material": "Верх: полиэстер с пайетками. Подкладка: хлопок",
            "sizes": ["104", "110", "116", "122"],
            "colors": ["pink", "lavender"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
        },
        {
            "name": "Кожаные мокасины",
            "slug": "kozhanye-mokasiny",
            "sku": "VK-SH-018",
            "brand": "little-lord",
            "category": "suits",
            "gender": Gender.BOYS,
            "purchase_price": 180000,
            "selling_price": 490000,
            "material": "Натуральная кожа",
            "sizes": ["98", "104", "110", "116"],
            "colors": ["navy", "burgundy"],
            "status": ProductStatus.ACTIVE,
        },
        {
            "name": "Пуховой жилет",
            "slug": "puhovoy-zhilet",
            "sku": "VK-VT-019",
            "brand": "nord-baby",
            "category": "boys_jackets",
            "collection": "osen-zima-2026",
            "gender": Gender.UNISEX,
            "purchase_price": 150000,
            "selling_price": 420000,
            "discount_percent": 15,
            "discount_price": 357000,
            "material": "Верх: нейлон. Утеплитель: 90% пух",
            "sizes": ["104", "110", "116", "122"],
            "colors": ["navy", "olive", "burgundy"],
            "status": ProductStatus.ACTIVE,
        },
        {
            "name": "Хлопковый муслиновый набор (5 предметов)",
            "slug": "muslinovyy-nabor-5",
            "sku": "VK-NB-020",
            "brand": "velmora",
            "category": "newborn_sets",
            "gender": Gender.UNISEX,
            "purchase_price": 200000,
            "selling_price": 580000,
            "material": "100% органический муслин",
            "sizes": ["56", "62"],
            "colors": ["cream", "milk"],
            "status": ProductStatus.ACTIVE,
            "is_bestseller": True,
        },
    ]

    for p in product_data:
        product = Product(
            name=p["name"],
            name_ru=p["name"],
            slug=p["slug"],
            sku=p["sku"],
            brand_id=brands[p["brand"]].id,
            category_id=categories[p["category"]].id,
            collection_id=collections[p["collection"]].id if p.get("collection") else None,
            gender=p["gender"],
            purchase_price=Decimal(str(p["purchase_price"])),
            selling_price=Decimal(str(p["selling_price"])),
            discount_percent=p.get("discount_percent", 0),
            discount_price=Decimal(str(p["discount_price"])) if p.get("discount_price") else None,
            material=p.get("material"),
            status=p.get("status", ProductStatus.ACTIVE),
            is_featured=p.get("is_featured", False),
            is_bestseller=p.get("is_bestseller", False),
            is_new=p.get("is_new", False),
            description=p["name"],
            description_ru=p["name"],
        )
        db.add(product)
        await db.flush()

        img = ProductImage(
            product_id=product.id,
            url="/images/placeholder.webp",
            alt_text=p["name"],
            sort_order=0,
            is_primary=True,
        )
        db.add(img)

        for s_name in p["sizes"]:
            for c_key in p["colors"]:
                variant = ProductVariant(
                    product_id=product.id,
                    size_id=sizes[s_name].id,
                    color_id=colors[c_key].id,
                    sku=f"{p['sku']}-{s_name}-{c_key[:3].upper()}",
                    is_active=True,
                )
                db.add(variant)

        await db.flush()
        products.append(product)

    return products


async def seed_warehouse(db, products, users):
    warehouse = Warehouse(name="Главный склад", address="Ташкент, ул. Навои, 12", is_active=True)
    db.add(warehouse)
    await db.flush()

    loc = WarehouseLocation(warehouse_id=warehouse.id, name="A-1-1", description="Основной стеллаж")
    db.add(loc)
    await db.flush()

    admin = users.get("super_admin")

    result = await db.execute(select(ProductVariant))
    variants = list(result.scalars().all())

    for variant in variants:
        import random
        qty = random.randint(5, 50)
        inv = Inventory(
            product_variant_id=variant.id,
            warehouse_id=warehouse.id,
            quantity=qty,
            reserved=0,
            location_id=loc.id,
        )
        db.add(inv)
        await db.flush()

        mov = InventoryMovement(
            inventory_id=inv.id,
            movement_type=MovementType.INCOMING,
            quantity=qty,
            quantity_before=0,
            quantity_after=qty,
            reference_type="seed",
            notes="Initial stock seed",
            created_by=admin.id,
        )
        db.add(mov)

    await db.flush()
    return warehouse


async def seed_suppliers(db):
    data = [
        ("TurkTekstil", "Турция", "Мехмет Йылдыз", "+905321234567"),
        ("ChinaFashion Kids", "Китай", "Li Wei", "+8613812345678"),
        ("UzbekPima Cotton", "Узбекистан", "Равшан Холматов", "+998712345678"),
    ]
    suppliers = []
    for name, company, contact, phone in data:
        s = Supplier(name=name, company=company, contact_person=contact, phone=phone, is_active=True)
        db.add(s)
        await db.flush()
        suppliers.append(s)
    return suppliers


async def seed_customers(db, users):
    customers = []
    customer_users = [u for k, u in users.items() if k.startswith("customer_")]
    for u in customer_users:
        profile = CustomerProfile(
            user_id=u.id,
            crm_status=CRMStatus.NEW,
        )
        db.add(profile)

        addr = CustomerAddress(
            user_id=u.id,
            label="Дом",
            city="Ташкент",
            address="ул. Амира Темура, д. 50, кв. 12",
            is_default=True,
        )
        db.add(addr)
        customers.append(u)

    await db.flush()
    return customers


async def seed_orders(db, users, products, customers):
    if not customers or not products:
        return

    admin = users.get("super_admin")
    seller = users.get("seller")

    result = await db.execute(select(ProductVariant).limit(10))
    variants = list(result.scalars().all())
    if not variants:
        return

    orders_data = [
        (customers[0], OrderStatus.DELIVERED, PaymentStatus.PAID, PaymentMethod.PAYME),
        (customers[0], OrderStatus.SHIPPED, PaymentStatus.PAID, PaymentMethod.CLICK),
        (customers[1], OrderStatus.CONFIRMED, PaymentStatus.PAID, PaymentMethod.CASH),
        (customers[1], OrderStatus.NEW, PaymentStatus.PENDING, PaymentMethod.PAYME),
        (customers[2], OrderStatus.PROCESSING, PaymentStatus.PAID, PaymentMethod.CLICK),
        (customers[3] if len(customers) > 3 else customers[0], OrderStatus.NEW, PaymentStatus.PENDING, PaymentMethod.CASH),
    ]

    for i, (customer, status, pay_status, pay_method) in enumerate(orders_data):
        import random
        v = variants[i % len(variants)]
        qty = random.randint(1, 3)
        price = Decimal("350000")
        total = price * qty

        order = Order(
            order_number=f"VK-20260918-{str(i+1).zfill(4)}",
            customer_id=customer.id,
            status=status,
            subtotal=total,
            discount_amount=0,
            delivery_fee=0,
            total=total,
            payment_method=pay_method,
            payment_status=pay_status,
            customer_first_name=customer.first_name,
            customer_last_name=customer.last_name,
            customer_phone=customer.phone or "+998901234573",
            delivery_city="Ташкент",
            delivery_address="ул. Амира Темура, 50",
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30)),
        )
        db.add(order)
        await db.flush()

        oi = OrderItem(
            order_id=order.id,
            product_variant_id=v.id,
            product_name=f"Товар {i+1}",
            product_sku=v.sku,
            size_name="104",
            color_name="Белый",
            quantity=qty,
            unit_price=price,
            total=total,
        )
        db.add(oi)

        payment = Payment(
            order_id=order.id,
            provider=pay_method,
            amount=total,
            status=TransactionStatus.COMPLETED if pay_status == PaymentStatus.PAID else TransactionStatus.PENDING,
        )
        db.add(payment)

    await db.flush()


async def seed_crm(db, users, products, customers):
    cc = users.get("call_center")
    if not cc or not customers:
        return

    leads_data = [
        ("Фарход Каримов", "+998901112233", "phone", "Хочу заказать комбинезон", LeadPriority.HIGH),
        ("Нигора Ахмедова", "+998901112234", "website", "Вопрос по доставке", LeadPriority.MEDIUM),
        ("Шахзод Ибрагимов", "+998901112235", "product_question", "Есть ли размер 128?", LeadPriority.LOW),
        ("Дилором Усмонова", "+998901112236", "callback", None, LeadPriority.URGENT),
    ]

    for name, phone, source, message, priority in leads_data:
        lead = CRMLead(
            customer_name=name,
            customer_phone=phone,
            source=source,
            message=message,
            priority=priority,
            status=LeadStatus.NEW,
        )
        db.add(lead)
        await db.flush()

        activity = CRMActivity(
            lead_id=lead.id,
            activity_type="created",
            description=f"Обращение от {name} через {source}",
            performed_by=cc.id,
        )
        db.add(activity)

    await db.flush()


async def seed_content(db, users, products):
    admin = users.get("super_admin")
    customers = [u for k, u in users.items() if k.startswith("customer_")]

    if products and customers:
        for i, product in enumerate(products[:5]):
            review = Review(
                user_id=customers[i % len(customers)].id,
                product_id=product.id,
                rating=4 + (i % 2),
                title="Отличное качество!",
                comment="Ребёнку очень понравилось. Ткань мягкая, пошив аккуратный.",
                is_approved=True,
                is_visible=True,
            )
            db.add(review)

        for i, product in enumerate(products[:3]):
            q = ProductQuestion(
                product_id=product.id,
                customer_name="Зарина",
                customer_phone="+998901234573",
                question="Этот товар подходит для 5-летнего ребёнка?",
                answer="Да, рекомендуем размер 110 для возраста 4-5 лет." if i < 2 else None,
                answered_by=admin.id if i < 2 else None,
                is_public=True,
            )
            db.add(q)

    now = datetime.now(timezone.utc)
    promo = Promotion(
        name="Скидка на первый заказ",
        code="WELCOME10",
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("10"),
        is_active=True,
        start_date=now - timedelta(days=30),
        end_date=now + timedelta(days=60),
        applies_to=PromotionAppliesTo.ALL,
    )
    db.add(promo)

    promo2 = Promotion(
        name="Зимняя распродажа",
        code="WINTER20",
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("20"),
        min_order_amount=Decimal("500000"),
        is_active=True,
        start_date=now,
        end_date=now + timedelta(days=90),
        applies_to=PromotionAppliesTo.ALL,
    )
    db.add(promo2)

    if admin:
        notif = Notification(
            user_id=admin.id,
            title="Добро пожаловать!",
            message="Система Velmora Kids успешно настроена.",
            type="system",
        )
        db.add(notif)

    await db.flush()


async def seed_banners(db):
    banners = [
        Banner(
            title="Новая коллекция Осень-Зима 2026",
            title_ru="Новая коллекция Осень-Зима 2026",
            subtitle="Премиальная детская одежда для особенных моментов",
            subtitle_ru="Премиальная детская одежда для особенных моментов",
            image="/images/hero-banner.webp",
            button_text="Смотреть коллекцию",
            link="/catalog?collection=osen-zima-2026",
            position="hero",
            sort_order=0,
            is_active=True,
        ),
        Banner(
            title="Скидки до 25%",
            title_ru="Скидки до 25%",
            subtitle="На избранные модели прошлого сезона",
            subtitle_ru="На избранные модели прошлого сезона",
            image="/images/promo-banner.webp",
            button_text="Смотреть распродажу",
            link="/catalog?is_on_sale=true",
            position="promo",
            sort_order=1,
            is_active=True,
        ),
    ]
    for b in banners:
        db.add(b)
    await db.flush()


if __name__ == "__main__":
    asyncio.run(seed())
