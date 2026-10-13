"""
seed_data.py — Database Seeding Script
Seeds cold storage facilities from CSV and creates a default admin user.
Run this after setting up PostgreSQL: python -m backend.seed_data
"""

import csv
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.database import engine, SessionLocal, Base
from backend.models import User, UserRole, ColdStorage
from backend.auth import hash_password


def seed_cold_storages(db):
    """Load cold storage facilities from CSV into database."""
    csv_path = project_root / "cold_storage_karnataka.csv"
    if not csv_path.exists():
        print(f"  WARN  CSV not found at {csv_path}")
        return

    # Check if already seeded
    existing = db.query(ColdStorage).count()
    if existing > 0:
        print(f"  INFO  Cold storages already seeded ({existing} records). Skipping.")
        return

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            storage = ColdStorage(
                facility_id=row["facility_id"],
                facility_name=row["facility_name"],
                district=row["district"],
                taluk=row.get("taluk", ""),
                address=row.get("address", ""),
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                capacity_mt=int(row["capacity_mt"]),
                temperature_min_c=float(row.get("temperature_min_c", -2)),
                temperature_max_c=float(row.get("temperature_max_c", 8)),
                commodities_stored=row.get("commodities_stored", ""),
                operator_type=row.get("operator_type", "Private"),
                contact_phone=row.get("contact_phone", ""),
                contact_email=row.get("contact_email", ""),
                operational_status=row.get("operational_status", "Active"),
                nwrda_registered=row.get("nwrda_registered", "No"),
                year_established=int(row["year_established"]) if row.get("year_established") else None,
                occupancy_pct=float(row.get("occupancy_pct", 65.0)),
                price_per_ton_day=float(row.get("price_per_ton_day", 180.0)),
                base_temp_c=float(row.get("base_temp_c", 4.0)),
            )
            db.add(storage)
            count += 1

        db.commit()
        print(f"  OK  Seeded {count} cold storage facilities.")


def seed_default_users(db):
    """Create default admin and demo users."""
    default_users = [
        {
            "full_name": "Admin User",
            "phone": "9999999999",
            "email": "admin@postharvest.in",
            "password": "admin123",
            "role": UserRole.admin,
            "district": "Bengaluru Urban",
        },
        {
            "full_name": "Anandappa (Demo Farmer)",
            "phone": "9448098765",
            "email": "farmer@postharvest.in",
            "password": "farmer123",
            "role": UserRole.farmer,
            "district": "Kolar",
        },
        {
            "full_name": "Warehouse Manager Demo",
            "phone": "9845012345",
            "email": "warehouse@postharvest.in",
            "password": "warehouse123",
            "role": UserRole.warehouse_manager,
            "district": "Kolar",
        },
    ]

    for user_data in default_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            print(f"  INFO  User '{user_data['email']}' already exists. Skipping.")
            continue

        user = User(
            full_name=user_data["full_name"],
            phone=user_data["phone"],
            email=user_data["email"],
            password_hash=hash_password(user_data["password"]),
            role=user_data["role"],
            district=user_data["district"],
        )
        db.add(user)
        db.commit()
        print(f"  OK  Created user: {user_data['email']} (role: {user_data['role'].value})")

    demo_manager = db.query(User).filter(User.email == "warehouse@postharvest.in").first()
    if demo_manager:
        assigned_count = db.query(ColdStorage).filter(ColdStorage.manager_id == demo_manager.id).count()
        if assigned_count == 0:
            db.query(ColdStorage).filter(
                ColdStorage.district == "Kolar",
                ColdStorage.manager_id.is_(None),
            ).update({ColdStorage.manager_id: demo_manager.id}, synchronize_session="fetch")
            db.commit()


def main():
    print("\nPost-Harvest Loss Prediction - Database Seeder")
    print("=" * 55)

    # Create all tables
    print("\nCreating database tables...")
    Base.metadata.create_all(bind=engine)
    print("  OK  All tables created successfully.")

    # Seed data
    db = SessionLocal()
    try:
        print("\nSeeding cold storage facilities...")
        seed_cold_storages(db)

        print("\nSeeding default users...")
        seed_default_users(db)

        print("\n" + "=" * 55)
        print("Database seeding complete!")
        print("\nDefault login credentials:")
        print("  Admin:     admin@postharvest.in / admin123")
        print("  Farmer:    farmer@postharvest.in / farmer123")
        print("  Warehouse: warehouse@postharvest.in / warehouse123")
        print("=" * 55 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
