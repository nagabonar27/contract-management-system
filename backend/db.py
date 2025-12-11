import sqlite3
import os

DB_NAME = "contract_system.db"

def get_db():
    # Helper to find db in the same directory as this file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, DB_NAME)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # Enable Foreign Keys
    c.execute("PRAGMA foreign_keys = ON;")

    # --- TABLES ---
    c.executescript('''
        -- Dimensions
        CREATE TABLE IF NOT EXISTS dim_process_step (
            step_id INTEGER PRIMARY KEY, 
            step_name TEXT
        );
        CREATE TABLE IF NOT EXISTS dim_master_contract (
            master_id INTEGER PRIMARY KEY, 
            base_contract_number TEXT
        );

        -- Fact Process Log (History)
        CREATE TABLE IF NOT EXISTS fact_process_log (
            log_id INTEGER PRIMARY KEY,
            ongoing_id INTEGER,
            step_id INTEGER,
            user_id INTEGER DEFAULT 1, 
            status_date TEXT, 
            remarks TEXT,
            FOREIGN KEY(ongoing_id) REFERENCES fact_ongoing(id) ON DELETE CASCADE
        );
    ''')

    # --- SPECIAL HANDLING FOR FACT_ONGOING (Migration Logic) ---
    c.execute('''
        CREATE TABLE IF NOT EXISTS fact_ongoing (
            id INTEGER PRIMARY KEY,
            contract_name TEXT NOT NULL,
            current_step_id INTEGER DEFAULT 1,
            contract_type TEXT, 
            parent_contract_id INTEGER, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active_process BOOLEAN DEFAULT 1 
        );
    ''')
    
    # AUTO-FIX: Check if 'is_active_process' column exists in ongoing
    try:
        c.execute("SELECT is_active_process FROM fact_ongoing LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE fact_ongoing ADD COLUMN is_active_process BOOLEAN DEFAULT 1")
        conn.commit()

    # --- SPECIAL HANDLING FOR FACT_ACTIVE_CONTRACT (Migration Logic) ---
    # We need to make sure 'contract_type' exists in the active table
    c.execute('''
        CREATE TABLE IF NOT EXISTS fact_active_contract (
            contract_id INTEGER PRIMARY KEY,
            master_id INTEGER,
            ongoing_id INTEGER,
            contract_number TEXT,
            contract_version INTEGER,
            contract_name TEXT,
            contract_type TEXT, -- Added this column
            effective_date DATE,
            FOREIGN KEY(master_id) REFERENCES dim_master_contract(master_id)
        );
    ''')

    # AUTO-FIX: Check if 'contract_type' column exists in active table
    try:
        c.execute("SELECT contract_type FROM fact_active_contract LIMIT 1")
    except sqlite3.OperationalError:
        print("🔧 System: Updating Active Table... adding 'contract_type' column.")
        c.execute("ALTER TABLE fact_active_contract ADD COLUMN contract_type TEXT")
        conn.commit()

    # Seed Data for Steps
    c.executescript('''
        INSERT OR IGNORE INTO dim_process_step (step_id, step_name) VALUES 
        (1, 'Waiting Doc from User'), 
        (2, 'Review & Clarification'), 
        (3, 'KYC'), 
        (4, 'Negotiation'), 
        (5, 'Completed');
    ''')
    
    conn.commit()
    conn.close()
