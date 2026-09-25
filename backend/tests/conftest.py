import asyncio
import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.main import app
from app.models.user import User, UserRole
from app.models.product import (
    Category, Brand, Size, Color, Product, ProductVariant,
    ProductImage, Gender, ProductStatus,
)
from app.models.inventory import Warehouse, Inventory

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin@test.com",
        phone="+998900000001",
        hashed_password=hash_password("admin123"),
        first_name="Admin",
        last_name="User",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def customer_user(db_session: AsyncSession) -> User:
    user = User(
        email="customer@test.com",
        phone="+998900000002",
        hashed_password=hash_password("customer123"),
        first_name="Customer",
        last_name="User",
        role=UserRole.CUSTOMER,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def seller_user(db_session: AsyncSession) -> User:
    user = User(
        email="seller@test.com",
        phone="+998900000003",
        hashed_password=hash_password("seller123"),
        first_name="Seller",
        last_name="User",
        role=UserRole.SELLER,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def call_center_user(db_session: AsyncSession) -> User:
    user = User(
        email="cc@test.com",
        phone="+998900000004",
        hashed_password=hash_password("cc123"),
        first_name="CallCenter",
        last_name="User",
        role=UserRole.CALL_CENTER,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_token(admin_user: User) -> str:
    return create_access_token({"sub": str(admin_user.id)})


@pytest_asyncio.fixture
async def customer_token(customer_user: User) -> str:
    return create_access_token({"sub": str(customer_user.id)})


@pytest_asyncio.fixture
async def seller_token(seller_user: User) -> str:
    return create_access_token({"sub": str(seller_user.id)})


@pytest_asyncio.fixture
async def call_center_token(call_center_user: User) -> str:
    return create_access_token({"sub": str(call_center_user.id)})


@pytest_asyncio.fixture
async def sample_category(db_session: AsyncSession) -> Category:
    cat = Category(name="Girls", slug="girls", is_active=True)
    db_session.add(cat)
    await db_session.flush()
    await db_session.refresh(cat)
    return cat


@pytest_asyncio.fixture
async def sample_brand(db_session: AsyncSession) -> Brand:
    brand = Brand(name="Velmora", slug="velmora", is_active=True)
    db_session.add(brand)
    await db_session.flush()
    await db_session.refresh(brand)
    return brand


@pytest_asyncio.fixture
async def sample_size(db_session: AsyncSession) -> Size:
    size = Size(name="104", sort_order=1, size_type="children")
    db_session.add(size)
    await db_session.flush()
    await db_session.refresh(size)
    return size


@pytest_asyncio.fixture
async def sample_color(db_session: AsyncSession) -> Color:
    color = Color(name="Pink", hex_code="#F9C4D2", is_active=True)
    db_session.add(color)
    await db_session.flush()
    await db_session.refresh(color)
    return color


@pytest_asyncio.fixture
async def sample_product(
    db_session: AsyncSession,
    sample_category: Category,
    sample_brand: Brand,
) -> Product:
    product = Product(
        name="Test Dress",
        slug="test-dress",
        sku="VK-TEST-001",
        brand_id=sample_brand.id,
        category_id=sample_category.id,
        gender=Gender.GIRLS,
        purchase_price=Decimal("100000"),
        selling_price=Decimal("250000"),
        status=ProductStatus.ACTIVE,
    )
    db_session.add(product)
    await db_session.flush()
    await db_session.refresh(product)
    return product


@pytest_asyncio.fixture
async def sample_variant(
    db_session: AsyncSession,
    sample_product: Product,
    sample_size: Size,
    sample_color: Color,
) -> ProductVariant:
    variant = ProductVariant(
        product_id=sample_product.id,
        size_id=sample_size.id,
        color_id=sample_color.id,
        sku="VK-TEST-001-104-PNK",
        is_active=True,
    )
    db_session.add(variant)
    await db_session.flush()
    await db_session.refresh(variant)
    return variant


@pytest_asyncio.fixture
async def sample_warehouse(db_session: AsyncSession) -> Warehouse:
    wh = Warehouse(name="Main Warehouse", is_active=True)
    db_session.add(wh)
    await db_session.flush()
    await db_session.refresh(wh)
    return wh


@pytest_asyncio.fixture
async def sample_inventory(
    db_session: AsyncSession,
    sample_variant: ProductVariant,
    sample_warehouse: Warehouse,
) -> Inventory:
    inv = Inventory(
        product_variant_id=sample_variant.id,
        warehouse_id=sample_warehouse.id,
        quantity=50,
        reserved=0,
    )
    db_session.add(inv)
    await db_session.flush()
    await db_session.refresh(inv)
    return inv
