"""
Seed the database with realistic data for Velmora Kids (vehicles & ride-ons).
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
    Category, Brand, Collection, Color, Product, ProductVariant,
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
        print("Seeding colors...")
        colors = await seed_colors(db)
        print("Seeding collections...")
        collections = await seed_collections(db)
        print("Seeding products...")
        products = await seed_products(db, categories, brands, collections, colors)
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
            email=email, phone=phone, hashed_password=hash_password("password123"),
            first_name=first, last_name=last, role=role, is_active=True, is_verified=True,
        )
        db.add(user)
        await db.flush()
        users[role.value if role != UserRole.CUSTOMER else f"customer_{email}"] = user
    return users


async def seed_categories(db: AsyncSession) -> dict:
    cats = {}
    root_data = [
        ("Самокаты", "samokaty", "scooters"),
        ("Электромобили", "elektromobili", "ride_on_cars"),
        ("Коляски", "kolyaski", "strollers"),
        ("Велосипеды", "velosipedy", "bicycles"),
        ("Распродажа", "rasprodazha", "sale"),
    ]
    for i, (name, slug, key) in enumerate(root_data):
        cat = Category(name=name, name_ru=name, slug=slug, is_active=True, sort_order=i)
        db.add(cat)
        await db.flush()
        cats[key] = cat

    sub_data = [
        ("Трёхколёсные", "trekhkolyosnye-samokaty", "scooters", "scooters_3wheel"),
        ("Двухколёсные", "dvukhkolyosnye-samokaty", "scooters", "scooters_2wheel"),
        ("Кикборды", "kikbordy", "scooters", "kickboards"),
        ("Легковые", "legkovye-elektromobili", "ride_on_cars", "cars_sedan"),
        ("Джипы", "dzhipy", "ride_on_cars", "cars_jeep"),
        ("Мотоциклы", "mototsikly", "ride_on_cars", "motorcycles"),
        ("Прогулочные", "progulochnye-kolyaski", "strollers", "strollers_walk"),
        ("Трансформеры", "transformery", "strollers", "strollers_transform"),
        ("Трёхколёсные", "trekhkolyosnye-velo", "bicycles", "bicycles_3wheel"),
        ("Беговелы", "begovely", "bicycles", "balance_bikes"),
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
        ("Micro", "micro"),
        ("Globber", "globber"),
        ("Xiaomi", "xiaomi"),
        ("Chicco", "chicco"),
    ]
    for name, slug in data:
        brand = Brand(name=name, slug=slug, is_active=True)
        db.add(brand)
        await db.flush()
        brands[slug] = brand
    return brands


async def seed_colors(db: AsyncSession) -> dict:
    colors = {}
    data = [
        ("Белый", "#FFFFFF", "white"),
        ("Чёрный", "#000000", "black"),
        ("Красный", "#E53935", "red"),
        ("Синий", "#1E88E5", "blue"),
        ("Розовый", "#F48FB1", "pink"),
        ("Зелёный", "#43A047", "green"),
        ("Жёлтый", "#FDD835", "yellow"),
        ("Серый", "#9E9E9E", "gray"),
        ("Оранжевый", "#FF9800", "orange"),
        ("Фиолетовый", "#8E24AA", "purple"),
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
        ("Новинки сезона", "novinki-sezona"),
    ]
    for name, slug in data:
        coll = Collection(name=name, name_ru=name, slug=slug, is_active=True)
        db.add(coll)
        await db.flush()
        colls[slug] = coll
    return colls


async def seed_products(db, categories, brands, collections, colors) -> list:
    products = []
    product_data = [
        {
            "name": "Самокат трёхколёсный Velmora Mini",
            "slug": "samokat-velmora-mini",
            "sku": "VK-SC-001",
            "brand": "velmora",
            "category": "scooters_3wheel",
            "collection": "novinki-sezona",
            "gender": Gender.BOTH,
            "purchase_price": 250000,
            "selling_price": 590000,
            "discount_percent": 15,
            "discount_price": 501500,
            "age_min": 2, "age_max": 5,
            "max_weight_kg": 35, "product_weight_kg": 2.5,
            "wheel_type": "PU (полиуретан)",
            "wheel_count": 3,
            "has_lights": True,
            "colors": ["pink", "blue", "green"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True, "is_bestseller": True,
        },
        {
            "name": "Самокат двухколёсный Micro Cruiser",
            "slug": "samokat-micro-cruiser",
            "sku": "VK-SC-002",
            "brand": "micro",
            "category": "scooters_2wheel",
            "gender": Gender.BOYS,
            "purchase_price": 400000,
            "selling_price": 890000,
            "age_min": 5, "age_max": 12,
            "max_weight_kg": 50, "product_weight_kg": 3.2,
            "wheel_type": "PU 120мм",
            "wheel_count": 2,
            "has_lights": False,
            "colors": ["black", "blue"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True, "is_new": True,
        },
        {
            "name": "Электромобиль Mercedes-Benz G63 Kids",
            "slug": "elektromobil-mercedes-g63",
            "sku": "VK-EC-001",
            "brand": "velmora",
            "category": "cars_jeep",
            "collection": "osen-zima-2026",
            "gender": Gender.BOYS,
            "purchase_price": 1800000,
            "selling_price": 3490000,
            "discount_percent": 10,
            "discount_price": 3141000,
            "age_min": 2, "age_max": 6,
            "max_weight_kg": 30, "product_weight_kg": 18,
            "dimensions": "110×65×55 см",
            "wheel_type": "EVA резина",
            "wheel_count": 4,
            "max_speed_kmh": 5,
            "battery_type": "12V 7Ah",
            "has_remote_control": True, "has_lights": True, "has_music": True,
            "colors": ["black", "white", "red"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True, "is_bestseller": True,
        },
        {
            "name": "Электромобиль BMW i8 для девочек",
            "slug": "elektromobil-bmw-i8-pink",
            "sku": "VK-EC-002",
            "brand": "velmora",
            "category": "cars_sedan",
            "gender": Gender.GIRLS,
            "purchase_price": 1500000,
            "selling_price": 2890000,
            "age_min": 1, "age_max": 5,
            "max_weight_kg": 25, "product_weight_kg": 14,
            "dimensions": "100×55×45 см",
            "wheel_type": "Пластик + резиновая накладка",
            "wheel_count": 4,
            "max_speed_kmh": 4,
            "battery_type": "6V 4.5Ah",
            "has_remote_control": True, "has_lights": True, "has_music": True,
            "colors": ["pink", "white"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
        },
        {
            "name": "Детский мотоцикл Ducati",
            "slug": "detskiy-mototsikl-ducati",
            "sku": "VK-MC-001",
            "brand": "velmora",
            "category": "motorcycles",
            "gender": Gender.BOYS,
            "purchase_price": 800000,
            "selling_price": 1690000,
            "age_min": 3, "age_max": 8,
            "max_weight_kg": 35, "product_weight_kg": 10,
            "dimensions": "90×45×60 см",
            "wheel_type": "EVA",
            "wheel_count": 2,
            "max_speed_kmh": 6,
            "battery_type": "12V 7Ah",
            "has_lights": True, "has_music": True,
            "colors": ["red", "black"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Коляска Chicco Bravo 3-в-1",
            "slug": "kolyaska-chicco-bravo",
            "sku": "VK-ST-001",
            "brand": "chicco",
            "category": "strollers_transform",
            "gender": Gender.BOTH,
            "purchase_price": 2200000,
            "selling_price": 4290000,
            "discount_percent": 20,
            "discount_price": 3432000,
            "age_min": 0, "age_max": 3,
            "max_weight_kg": 22, "product_weight_kg": 12,
            "dimensions": "85×60×105 см",
            "wheel_type": "Резина надувная",
            "wheel_count": 4,
            "colors": ["gray", "black"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True, "is_bestseller": True,
        },
        {
            "name": "Прогулочная коляска Globber Compact",
            "slug": "kolyaska-globber-compact",
            "sku": "VK-ST-002",
            "brand": "globber",
            "category": "strollers_walk",
            "gender": Gender.BOTH,
            "purchase_price": 900000,
            "selling_price": 1890000,
            "age_min": 0, "age_max": 3,
            "max_weight_kg": 22, "product_weight_kg": 7,
            "dimensions": "75×50×100 см",
            "wheel_type": "EVA",
            "wheel_count": 4,
            "colors": ["blue", "pink", "gray"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Кикборд Globber Elite Deluxe",
            "slug": "kikbord-globber-elite",
            "sku": "VK-KB-001",
            "brand": "globber",
            "category": "kickboards",
            "gender": Gender.BOTH,
            "purchase_price": 350000,
            "selling_price": 750000,
            "age_min": 3, "age_max": 10,
            "max_weight_kg": 50, "product_weight_kg": 2.8,
            "wheel_type": "PU со светодиодами",
            "wheel_count": 3,
            "has_lights": True,
            "colors": ["green", "pink", "blue"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Электросамокат Xiaomi Kids Pro",
            "slug": "elektrosamokat-xiaomi-kids",
            "sku": "VK-ES-001",
            "brand": "xiaomi",
            "category": "scooters_2wheel",
            "collection": "novinki-sezona",
            "gender": Gender.BOTH,
            "purchase_price": 700000,
            "selling_price": 1450000,
            "age_min": 6, "age_max": 14,
            "max_weight_kg": 60, "product_weight_kg": 7.5,
            "dimensions": "100×42×95 см",
            "wheel_type": "Пневматические 8 дюймов",
            "wheel_count": 2,
            "max_speed_kmh": 14,
            "battery_type": "36V 5Ah Li-ion",
            "has_lights": True,
            "colors": ["black", "white"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True, "is_new": True,
        },
        {
            "name": "Беговел Micro Balance Bike",
            "slug": "begovel-micro-balance",
            "sku": "VK-BB-001",
            "brand": "micro",
            "category": "balance_bikes",
            "gender": Gender.BOTH,
            "purchase_price": 450000,
            "selling_price": 890000,
            "age_min": 2, "age_max": 5,
            "max_weight_kg": 25, "product_weight_kg": 3,
            "wheel_type": "EVA 12 дюймов",
            "wheel_count": 2,
            "colors": ["red", "blue", "yellow"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
        },
        {
            "name": "Велосипед трёхколёсный Chicco Pelican",
            "slug": "velosiped-chicco-pelican",
            "sku": "VK-VL-001",
            "brand": "chicco",
            "category": "bicycles_3wheel",
            "gender": Gender.BOTH,
            "purchase_price": 600000,
            "selling_price": 1190000,
            "age_min": 1, "age_max": 4,
            "max_weight_kg": 25, "product_weight_kg": 8,
            "dimensions": "75×50×90 см",
            "wheel_type": "Резина EVA",
            "wheel_count": 3,
            "has_music": True,
            "colors": ["red", "blue", "green"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True,
        },
        {
            "name": "Электроквадроцикл Velmora ATV-1000",
            "slug": "elektrokvadrotsikl-velmora",
            "sku": "VK-ATV-001",
            "brand": "velmora",
            "category": "cars_jeep",
            "gender": Gender.BOYS,
            "purchase_price": 1200000,
            "selling_price": 2490000,
            "age_min": 3, "age_max": 8,
            "max_weight_kg": 40, "product_weight_kg": 15,
            "dimensions": "100×65×70 см",
            "wheel_type": "EVA резина",
            "wheel_count": 4,
            "max_speed_kmh": 7,
            "battery_type": "12V 10Ah",
            "has_remote_control": True, "has_lights": True, "has_music": True,
            "colors": ["green", "red", "orange"],
            "status": ProductStatus.ACTIVE,
            "is_bestseller": True,
        },
        {
            "name": "Самокат-трансформер Globber 5-в-1",
            "slug": "samokat-globber-5v1",
            "sku": "VK-SC-003",
            "brand": "globber",
            "category": "scooters_3wheel",
            "collection": "novinki-sezona",
            "gender": Gender.BOTH,
            "purchase_price": 500000,
            "selling_price": 1090000,
            "discount_percent": 10,
            "discount_price": 981000,
            "age_min": 1, "age_max": 6,
            "max_weight_kg": 50, "product_weight_kg": 3.5,
            "wheel_type": "PU светящиеся",
            "wheel_count": 3,
            "has_lights": True,
            "colors": ["pink", "blue", "green"],
            "status": ProductStatus.ACTIVE,
            "is_featured": True, "is_new": True,
        },
        {
            "name": "Электромобиль Range Rover Evoque",
            "slug": "elektromobil-range-rover-evoque",
            "sku": "VK-EC-003",
            "brand": "velmora",
            "category": "cars_jeep",
            "gender": Gender.BOTH,
            "purchase_price": 2000000,
            "selling_price": 3990000,
            "age_min": 2, "age_max": 7,
            "max_weight_kg": 35, "product_weight_kg": 20,
            "dimensions": "120×70×60 см",
            "wheel_type": "EVA резина",
            "wheel_count": 4,
            "max_speed_kmh": 6,
            "battery_type": "12V 10Ah",
            "has_remote_control": True, "has_lights": True, "has_music": True,
            "colors": ["white", "black"],
            "status": ProductStatus.ACTIVE,
        },
        {
            "name": "Коляска-трость Xiaomi MITU",
            "slug": "kolyaska-trost-xiaomi",
            "sku": "VK-ST-003",
            "brand": "xiaomi",
            "category": "strollers_walk",
            "gender": Gender.BOTH,
            "purchase_price": 1100000,
            "selling_price": 2190000,
            "discount_percent": 15,
            "discount_price": 1861500,
            "age_min": 0, "age_max": 3,
            "max_weight_kg": 20, "product_weight_kg": 6,
            "dimensions": "70×45×100 см",
            "wheel_type": "Резина",
            "wheel_count": 4,
            "colors": ["gray", "black"],
            "status": ProductStatus.ACTIVE,
        },
        {
            "name": "Самокат Micro Maxi Deluxe LED",
            "slug": "samokat-micro-maxi-led",
            "sku": "VK-SC-004",
            "brand": "micro",
            "category": "scooters_3wheel",
            "gender": Gender.GIRLS,
            "purchase_price": 450000,
            "selling_price": 950000,
            "age_min": 5, "age_max": 12,
            "max_weight_kg": 50, "product_weight_kg": 2.5,
            "wheel_type": "PU LED",
            "wheel_count": 3,
            "has_lights": True,
            "colors": ["purple", "pink"],
            "status": ProductStatus.ACTIVE,
            "is_new": True,
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
            age_min=p.get("age_min"),
            age_max=p.get("age_max"),
            max_weight_kg=Decimal(str(p["max_weight_kg"])) if p.get("max_weight_kg") else None,
            product_weight_kg=Decimal(str(p["product_weight_kg"])) if p.get("product_weight_kg") else None,
            dimensions=p.get("dimensions"),
            wheel_type=p.get("wheel_type"),
            wheel_count=p.get("wheel_count"),
            max_speed_kmh=p.get("max_speed_kmh"),
            battery_type=p.get("battery_type"),
            has_remote_control=p.get("has_remote_control", False),
            has_lights=p.get("has_lights", False),
            has_music=p.get("has_music", False),
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
            file_path="/uploads/products/placeholder.webp",
            alt_text=p["name"],
            sort_order=0,
            is_primary=True,
        )
        db.add(img)

        for c_key in p["colors"]:
            variant = ProductVariant(
                product_id=product.id,
                color_id=colors[c_key].id,
                sku=f"{p['sku']}-{c_key[:3].upper()}",
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
        qty = random.randint(5, 30)
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
        ("ChinaRide", "Китай", "Li Wei", "+8613812345678"),
        ("TurkVehicle", "Турция", "Мехмет Йылдыз", "+905321234567"),
        ("UzToys", "Узбекистан", "Равшан Холматов", "+998712345678"),
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
        profile = CustomerProfile(user_id=u.id, crm_status=CRMStatus.NEW)
        db.add(profile)
        addr = CustomerAddress(
            user_id=u.id, label="Дом", city="Ташкент",
            address="ул. Амира Темура, д. 50, кв. 12", is_default=True,
        )
        db.add(addr)
        customers.append(u)
    await db.flush()
    return customers


async def seed_orders(db, users, products, customers):
    if not customers or not products:
        return
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

    for i, (customer, o_status, pay_status, pay_method) in enumerate(orders_data):
        import random
        v = variants[i % len(variants)]
        qty = random.randint(1, 2)
        price = Decimal("890000")
        total = price * qty

        order = Order(
            order_number=f"VK-20260926-{str(i+1).zfill(4)}",
            customer_id=customer.id,
            status=o_status,
            subtotal=total, discount_amount=0, delivery_fee=0, total=total,
            payment_method=pay_method, payment_status=pay_status,
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
            size_name=None,
            color_name="Чёрный",
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
        ("Фарход Каримов", "+998901112233", "phone", "Хочу заказать электромобиль", LeadPriority.HIGH),
        ("Нигора Ахмедова", "+998901112234", "website", "Вопрос по доставке самоката", LeadPriority.MEDIUM),
        ("Шахзод Ибрагимов", "+998901112235", "product_question", "Есть ли белый цвет?", LeadPriority.LOW),
        ("Дилором Усмонова", "+998901112236", "callback", None, LeadPriority.URGENT),
    ]
    for name, phone, source, message, priority in leads_data:
        lead = CRMLead(
            customer_name=name, customer_phone=phone,
            source=source, message=message, priority=priority, status=LeadStatus.NEW,
        )
        db.add(lead)
        await db.flush()
        activity = CRMActivity(
            lead_id=lead.id, activity_type="created",
            description=f"Обращение от {name} через {source}", performed_by=cc.id,
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
                comment="Ребёнку очень понравилось. Крепкий, красивый, быстро доставили.",
                is_approved=True, is_visible=True,
            )
            db.add(review)

        for i, product in enumerate(products[:3]):
            q = ProductQuestion(
                product_id=product.id,
                customer_name="Зарина",
                customer_phone="+998901234573",
                question="Этот товар подходит для 3-летнего ребёнка?",
                answer="Да, рекомендуем для возраста 2-5 лет." if i < 2 else None,
                answered_by=admin.id if i < 2 else None,
                is_public=True,
            )
            db.add(q)

    now = datetime.now(timezone.utc)
    promo = Promotion(
        name="Скидка на первый заказ", code="WELCOME10",
        discount_type=DiscountType.PERCENTAGE, discount_value=Decimal("10"),
        is_active=True, start_date=now - timedelta(days=30),
        end_date=now + timedelta(days=60), applies_to=PromotionAppliesTo.ALL,
    )
    db.add(promo)
    promo2 = Promotion(
        name="Зимняя распродажа", code="WINTER20",
        discount_type=DiscountType.PERCENTAGE, discount_value=Decimal("20"),
        min_order_amount=Decimal("500000"), is_active=True,
        start_date=now, end_date=now + timedelta(days=90), applies_to=PromotionAppliesTo.ALL,
    )
    db.add(promo2)

    if admin:
        notif = Notification(
            user_id=admin.id, title="Добро пожаловать!",
            message="Система Velmora Kids успешно настроена.", type="system",
        )
        db.add(notif)
    await db.flush()


async def seed_banners(db):
    banners = [
        Banner(
            title="Новинки сезона — самокаты и электромобили",
            title_ru="Новинки сезона — самокаты и электромобили",
            subtitle="Премиальный детский транспорт для ваших малышей",
            subtitle_ru="Премиальный детский транспорт для ваших малышей",
            image="/uploads/banners/hero-banner.webp",
            button_text="Смотреть каталог",
            link="/catalog",
            position="hero",
            sort_order=0,
            is_active=True,
        ),
        Banner(
            title="Скидки до 25% на электромобили",
            title_ru="Скидки до 25% на электромобили",
            subtitle="Успейте купить по лучшей цене!",
            subtitle_ru="Успейте купить по лучшей цене!",
            image="/uploads/banners/promo-banner.webp",
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
