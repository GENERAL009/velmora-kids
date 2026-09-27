from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, products, orders, inventory, cart, favorites,
    crm, reviews, questions, payments, banners, promotions,
    notifications, reports, users, audit, customers,
    settings, bot_webhook,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(inventory.router)
api_router.include_router(cart.router)
api_router.include_router(favorites.router)
api_router.include_router(crm.router)
api_router.include_router(reviews.router)
api_router.include_router(questions.router)
api_router.include_router(payments.router)
api_router.include_router(banners.router)
api_router.include_router(promotions.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(users.router)
api_router.include_router(audit.router)
api_router.include_router(customers.router)
api_router.include_router(settings.router)
api_router.include_router(bot_webhook.router)
