import sqlite3
from datetime import datetime
from flask import Flask, render_template_string, request, redirect, url_for

app = Flask(__name__)
DB_NAME = "contract_system.db"

# ==========================================
# 1. DATABASE SETUP & INITIALIZATION
# ==========================================
def get_db():
    conn = sqlite3.connect(DB_NAME)
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

# Initialize DB on startup
init_db()


# ==========================================
# 2. ROUTES & LOGIC
# ==========================================

# --- DASHBOARD ---
@app.route('/')
def dashboard():
    conn = get_db()
    
    # 1. Get Ongoing Contracts (Only Active Processes)
    ongoing = conn.execute('''
        SELECT f.*, s.step_name 
        FROM fact_ongoing f
        JOIN dim_process_step s ON f.current_step_id = s.step_id
        WHERE f.is_active_process = 1
        ORDER BY f.id DESC
    ''').fetchall()
    
    # 2. Get Statistics (Only for active processes)
    stats = conn.execute('''
        SELECT s.step_name, COUNT(f.id) as count
        FROM dim_process_step s
        LEFT JOIN fact_ongoing f ON s.step_id = f.current_step_id AND f.is_active_process = 1
        GROUP BY s.step_name
    ''').fetchall()
    
    conn.close()
    return render_template_string(HTML_TEMPLATE, page='dashboard', ongoing=ongoing, stats=stats)


# --- CREATE NEW CONTRACT ---
@app.route('/create', methods=['POST'])
def create_contract():
    name = request.form.get('contract_name')
    c_type = request.form.get('contract_type') 
    
    # Default to "Pending" if nothing selected
    if not c_type:
        c_type = "Pending"

    conn = get_db()
    cursor = conn.cursor()
    
    # Insert new active process
    cursor.execute('''
        INSERT INTO fact_ongoing (contract_name, contract_type, current_step_id, is_active_process)
        VALUES (?, ?, 1, 1)
    ''', (name, c_type))
    
    # Auto-log the first step
    new_id = cursor.lastrowid
    
    # Safety cleanup
    cursor.execute('DELETE FROM fact_process_log WHERE ongoing_id = ?', (new_id,))
    
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('''
        INSERT INTO fact_process_log (ongoing_id, step_id, status_date, remarks)
        VALUES (?, 1, ?, 'Initial Request Created')
    ''', (new_id, today))
    
    conn.commit()
    conn.close()
    return redirect(url_for('dashboard'))


# --- UPDATE DETAILS (Name & Type) ---
@app.route('/update_details/<int:id>', methods=['POST'])
def update_details(id):
    new_name = request.form.get('contract_name')
    new_type = request.form.get('contract_type')
    
    conn = get_db()
    conn.execute('''
        UPDATE fact_ongoing 
        SET contract_name = ?, contract_type = ? 
        WHERE id = ?
    ''', (new_name, new_type, id))
    conn.commit()
    conn.close()
    return redirect(url_for('contract_detail', id=id))


# --- CONTRACT DETAILS ---
@app.route('/contract/<int:id>')
def contract_detail(id):
    conn = get_db()
    
    contract = conn.execute('''
        SELECT f.*, s.step_name 
        FROM fact_ongoing f
        JOIN dim_process_step s ON f.current_step_id = s.step_id
        WHERE f.id = ?
    ''', (id,)).fetchone()
    
    logs = conn.execute('''
        SELECT l.*, s.step_name 
        FROM fact_process_log l
        JOIN dim_process_step s ON l.step_id = s.step_id
        WHERE l.ongoing_id = ?
        ORDER BY l.status_date DESC, l.log_id DESC
    ''', (id,)).fetchall()
    
    steps = conn.execute('SELECT * FROM dim_process_step').fetchall()
    
    conn.close()
    return render_template_string(HTML_TEMPLATE, page='detail', contract=contract, logs=logs, steps=steps)


# --- ACTION: LOG A STEP ---
@app.route('/log_step/<int:id>', methods=['POST'])
def log_step(id):
    step_id = request.form.get('step_id')
    remarks = request.form.get('remarks')
    custom_date = request.form.get('custom_date')
    
    if not custom_date:
        custom_date = datetime.now().strftime('%Y-%m-%d')
    
    conn = get_db()
    conn.execute('UPDATE fact_ongoing SET current_step_id = ? WHERE id = ?', (step_id, id))
    conn.execute('''
        INSERT INTO fact_process_log (ongoing_id, step_id, status_date, remarks)
        VALUES (?, ?, ?, ?)
    ''', (id, step_id, custom_date, remarks))
    conn.commit()
    conn.close()
    return redirect(url_for('contract_detail', id=id))


# --- ACTION: FINALIZE (NOW SAVES TYPE) ---
@app.route('/finalize/<int:id>', methods=['POST'])
def finalize(id):
    legal_number = request.form.get('contract_number')
    effective_date = request.form.get('effective_date')
    
    conn = get_db()
    c = conn.cursor()
    
    # Get info from Ongoing (including the TYPE)
    ongoing = c.execute('SELECT * FROM fact_ongoing WHERE id = ?', (id,)).fetchone()
    
    master_id = None
    version = 1
    
    if ongoing['parent_contract_id']:
        parent = c.execute('''
            SELECT master_id, contract_version 
            FROM fact_active_contract 
            WHERE contract_id = ?
        ''', (ongoing['parent_contract_id'],)).fetchone()
        master_id = parent['master_id']
        version = parent['contract_version'] + 1
    else:
        c.execute('INSERT INTO dim_master_contract (base_contract_number) VALUES (?)', (legal_number,))
        master_id = c.lastrowid
        version = 1
        
    # INSERT INTO ACTIVE (Including contract_type)
    c.execute('''
        INSERT INTO fact_active_contract 
        (master_id, ongoing_id, contract_number, contract_version, contract_name, contract_type, effective_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (master_id, id, legal_number, version, ongoing['contract_name'], ongoing['contract_type'], effective_date))
    
    c.execute('UPDATE fact_ongoing SET is_active_process = 0 WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return redirect(url_for('active_contracts'))


# --- ACTIVE CONTRACTS ---
@app.route('/active')
def active_contracts():
    conn = get_db()
    contracts = conn.execute('SELECT * FROM fact_active_contract ORDER BY contract_number, contract_version').fetchall()
    conn.close()
    return render_template_string(HTML_TEMPLATE, page='active', contracts=contracts)


# --- ACTION: AMEND ---
@app.route('/amend/<int:active_id>')
def amend_contract(active_id):
    conn = get_db()
    active = conn.execute('SELECT * FROM fact_active_contract WHERE contract_id = ?', (active_id,)).fetchone()
    new_name = f"Amendment to {active['contract_name']}"
    
    c = conn.cursor()
    # Note: Type is hardcoded to 'Amendment' here
    c.execute('''
        INSERT INTO fact_ongoing (contract_name, contract_type, current_step_id, parent_contract_id, is_active_process)
        VALUES (?, 'Amendment', 1, ?, 1)
    ''', (new_name, active_id))
    new_id = c.lastrowid
    
    c.execute('DELETE FROM fact_process_log WHERE ongoing_id = ?', (new_id,))
    
    today = datetime.now().strftime('%Y-%m-%d')
    c.execute('''
        INSERT INTO fact_process_log (ongoing_id, step_id, status_date, remarks)
        VALUES (?, 1, ?, 'Amendment Process Initiated')
    ''', (new_id, today))
    conn.commit()
    conn.close()
    return redirect(url_for('contract_detail', id=new_id))


# ==========================================
# 3. FRONTEND TEMPLATE
# ==========================================
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Procurement System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .horizontal-scroll::-webkit-scrollbar { height: 6px; }
        .horizontal-scroll::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .horizontal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .horizontal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
</head>
<body class="bg-gray-100 text-gray-800 font-sans">

    <nav class="bg-slate-800 text-white p-4 shadow-lg sticky top-0 z-50">
        <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-xl font-bold"><i class="fa-solid fa-file-signature mr-2"></i>ProcureFlow</h1>
            <div>
                <a href="{{ url_for('dashboard') }}" class="px-4 py-2 hover:bg-slate-700 rounded {{ 'bg-slate-700' if page == 'dashboard' else '' }}">Dashboard</a>
                <a href="{{ url_for('active_contracts') }}" class="ml-2 px-4 py-2 hover:bg-slate-700 rounded {{ 'bg-slate-700' if page == 'active' else '' }}">Repository</a>
            </div>
        </div>
    </nav>

    <div class="container mx-auto p-6">

    {% if page == 'dashboard' %}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow col-span-2">
                <h2 class="text-lg font-bold mb-4">Contract Distribution</h2>
                <div class="flex space-x-4 overflow-x-auto pb-4 horizontal-scroll">
                    {% for stat in stats %}
                    <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-100 min-w-[140px] flex-shrink-0 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition">
                        <div class="text-3xl font-bold text-blue-600 mb-1">{{ stat['count'] }}</div>
                        <div class="text-[10px] font-bold text-gray-500 uppercase leading-tight">
                            {{ stat['step_name'] }}
                        </div>
                    </div>
                    {% endfor %}
                    {% if not stats %}
                    <div class="text-gray-400 text-sm italic p-4">No active data available.</div>
                    {% endif %}
                </div>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-lg font-bold mb-4">New Request</h2>
                <form action="{{ url_for('create_contract') }}" method="POST">
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-1">Contract Name</label>
                        <input type="text" name="contract_name" class="w-full border rounded p-2" required placeholder="e.g. Heavy Machinery Supply">
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-1">Type (Optional)</label>
                        <select name="contract_type" class="w-full border rounded p-2">
                            <option value="Pending">Pending / TBD</option>
                            <option value="Direct Selection">Direct Selection (DS)</option>
                            <option value="Direct Appointment">Direct Appointment (DA)</option>
                        </select>
                    </div>
                    <button class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold shadow-sm">
                        <i class="fa-solid fa-plus mr-1"></i> Create Request
                    </button>
                </form>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="font-bold text-gray-700">Ongoing Processes</h3>
            </div>
            <table class="min-w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Step</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    {% for item in ongoing %}
                    <tr class="hover:bg-gray-50 transition">
                        <td class="px-6 py-4 text-sm text-gray-500">#{{ item['id'] }}</td>
                        <td class="px-6 py-4 font-medium">{{ item['contract_name'] }}</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="px-2 py-1 rounded text-xs {{ 'bg-purple-100 text-purple-800' if item['contract_type'] == 'Amendment' else 'bg-gray-100 text-gray-800' }}">
                                {{ item['contract_type'] }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-blue-600 font-semibold">{{ item['step_name'] }}</td>
                        <td class="px-6 py-4">
                            <a href="{{ url_for('contract_detail', id=item['id']) }}" class="text-indigo-600 hover:text-indigo-900 font-medium">Process &rarr;</a>
                        </td>
                    </tr>
                    {% else %}
                    <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500 italic">No ongoing contracts found.</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>

    {% elif page == 'detail' %}
        <div class="mb-4">
            <a href="{{ url_for('dashboard') }}" class="text-blue-600 hover:underline">&larr; Back to Dashboard</a>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="col-span-2 space-y-6">
                
                {% if contract['step_name'] != 'Completed' %}
                <div class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <div class="flex justify-between items-start mb-4">
                        <h1 class="text-2xl font-bold text-gray-800">Contract Settings</h1>
                        <div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold shadow-sm text-sm">
                            {{ contract['step_name'] }}
                        </div>
                    </div>
                    
                    <form action="{{ url_for('update_details', id=contract['id']) }}" method="POST" class="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Contract Name</label>
                                <input type="text" name="contract_name" value="{{ contract['contract_name'] }}" class="w-full border rounded p-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Contract Type</label>
                                <select name="contract_type" class="w-full border rounded p-2 text-sm">
                                    <option value="Pending" {{ 'selected' if contract['contract_type'] == 'Pending' else '' }}>Pending / TBD</option>
                                    <option value="Direct Selection" {{ 'selected' if contract['contract_type'] == 'Direct Selection' else '' }}>Direct Selection (DS)</option>
                                    <option value="Direct Appointment" {{ 'selected' if contract['contract_type'] == 'Direct Appointment' else '' }}>Direct Appointment (DA)</option>
                                    <option value="Amendment" {{ 'selected' if contract['contract_type'] == 'Amendment' else '' }}>Amendment</option>
                                </select>
                            </div>
                        </div>
                        <div class="mt-3 text-right">
                            <button class="bg-slate-600 text-white px-3 py-1 rounded text-sm hover:bg-slate-700">Update Details</button>
                        </div>
                    </form>
                </div>
                {% else %}
                <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800">{{ contract['contract_name'] }}</h1>
                            <div class="text-sm text-gray-500 mt-1">
                                Type: {{ contract['contract_type'] }} | ID: #{{ contract['id'] }}
                            </div>
                        </div>
                        <div class="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold shadow-sm text-sm">
                            {{ contract['step_name'] }}
                        </div>
                    </div>
                </div>
                {% endif %}

                {% if contract['step_name'] != 'Completed' %}
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2 flex items-center">
                        <i class="fa-solid fa-pen-to-square mr-2 text-blue-500"></i> Log New Process Step
                    </h3>
                    <form action="{{ url_for('log_step', id=contract['id']) }}" method="POST">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="col-span-1">
                                <label class="block text-sm font-medium mb-1 text-gray-700">New Status</label>
                                <select name="step_id" class="w-full border rounded p-2 focus:ring focus:ring-blue-200">
                                    {% for s in steps %}
                                    <option value="{{ s['step_id'] }}" {{ 'selected' if s['step_name'] == contract['step_name'] else '' }}>
                                        {{ s['step_name'] }}
                                    </option>
                                    {% endfor %}
                                </select>
                            </div>
                            <div class="col-span-1">
                                <label class="block text-sm font-medium mb-1 text-gray-700">Date of Action</label>
                                <input type="date" name="custom_date" class="w-full border rounded p-2 focus:ring focus:ring-blue-200" required>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-sm font-medium mb-1 text-gray-700">Remarks</label>
                                <input type="text" name="remarks" class="w-full border rounded p-2 focus:ring focus:ring-blue-200" placeholder="e.g. Document received">
                            </div>
                        </div>
                        <button class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold shadow transition w-full md:w-auto">
                            Update Status
                        </button>
                    </form>
                </div>
                {% else %}
                <div class="bg-green-50 border border-green-200 p-6 rounded-lg shadow">
                    <h3 class="text-lg font-bold text-green-800 mb-2">Ready to Finalize</h3>
                    <p class="text-sm text-green-700 mb-4">Marked as Completed. Enter details to Activate.</p>
                    <form action="{{ url_for('finalize', id=contract['id']) }}" method="POST" class="flex flex-col md:flex-row gap-4 md:items-end">
                        <div class="flex-1">
                            <label class="block text-xs font-bold uppercase text-green-800 mb-1">Legal Contract No.</label>
                            <input type="text" name="contract_number" class="w-full border border-green-300 rounded p-2" required placeholder="LGL-202X-001">
                        </div>
                        <div class="flex-1">
                            <label class="block text-xs font-bold uppercase text-green-800 mb-1">Effective Date</label>
                            <input type="date" name="effective_date" class="w-full border border-green-300 rounded p-2" required>
                        </div>
                        <button class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold shadow">
                            Activate &rarr;
                        </button>
                    </form>
                </div>
                {% endif %}
            </div>

            <div class="bg-white p-6 rounded-lg shadow h-fit">
                <h3 class="text-lg font-bold mb-4 text-gray-700">📜 Process History</h3>
                <div class="relative border-l-2 border-gray-200 ml-3 space-y-6">
                    {% for log in logs %}
                    <div class="mb-4 ml-6 relative">
                        <span class="absolute -left-[31px] top-1 bg-white border-2 border-blue-400 rounded-full w-4 h-4"></span>
                        <div class="text-sm font-bold text-gray-800">{{ log['step_name'] }}</div>
                        <div class="text-xs text-gray-400 mb-1">
                            <i class="fa-regular fa-calendar mr-1"></i> {{ log['status_date'] }}
                        </div>
                        <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded border">{{ log['remarks'] }}</div>
                    </div>
                    {% else %}
                        <div class="ml-6 text-sm text-gray-400 italic">No history yet.</div>
                    {% endfor %}
                </div>
            </div>
        </div>

    {% elif page == 'active' %}
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Active Contract Repository</h2>
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contract No</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ver</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contract Name</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Effective Date</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Master ID</th>
                        <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    {% for c in contracts %}
                    <tr class="hover:bg-yellow-50 transition">
                        <td class="px-6 py-4 font-mono text-sm text-slate-600">{{ c['contract_number'] }}</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="px-2 py-1 rounded text-xs {{ 'bg-purple-100 text-purple-800' if c['contract_type'] == 'Amendment' else 'bg-blue-50 text-blue-700' }}">
                                {{ c['contract_type'] }}
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            <span class="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">v.{{ c['contract_version'] }}</span>
                        </td>
                        <td class="px-6 py-4 font-medium">{{ c['contract_name'] }}</td>
                        <td class="px-6 py-4 text-sm">{{ c['effective_date'] }}</td>
                        <td class="px-6 py-4 text-sm text-gray-400">#{{ c['master_id'] }}</td>
                        <td class="px-6 py-4 text-right">
                             <a href="{{ url_for('amend_contract', active_id=c['contract_id']) }}" 
                                onclick="return confirm('Start a new AMENDMENT process for this contract?')"
                                class="bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200 text-sm font-semibold border border-orange-200 shadow-sm">
                                <i class="fa-solid fa-pen-nib mr-1"></i> Amend
                             </a>
                        </td>
                    </tr>
                    {% else %}
                    <tr>
                        <td colspan="7" class="px-6 py-8 text-center text-gray-500 italic">No active contracts yet.</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    {% endif %}

    </div>
</body>
</html>
"""

if __name__ == '__main__':
    app.run(debug=True, port=5000)