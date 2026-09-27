# Import all models so that Alembic and SQLAlchemy can discover them.

from app.models.user import User, UserRole  # noqa: F401
from app.models.product import (  # noqa: F401
    Brand,
    Category,
    Collection,
    Color,
    Gender,
    Product,
    ProductImage,
    ProductStatus,
    ProductVariant,
)
from app.models.inventory import (  # noqa: F401
    StockLog,
    StockMovementType,
)
from app.models.order import (  # noqa: F401
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
    TransactionStatus,
)
from app.models.crm import (  # noqa: F401
    CRMActivity,
    CRMLead,
    CRMStatus,
    CustomerAddress,
    CustomerProfile,
    LeadPriority,
    LeadStatus,
)
from app.models.content import (  # noqa: F401
    AuditLog,
    Banner,
    Cart,
    CartItem,
    DiscountType,
    Favorite,
    Notification,
    ProductQuestion,
    Promotion,
    PromotionAppliesTo,
    Review,
)
