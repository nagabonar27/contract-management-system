from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from db import get_db, init_db

app = Flask(__name__)
# cors enabled
CORS(app)

# init db
init_db()

# --- ROUTES ---

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    conn = get_db()
    
    # 1. Get Ongoing Contracts (Only Active Processes)
    ongoing = conn.execute('''
        SELECT f.*, s.step_name
        FROM fact_ongoing f
        JOIN dim_process_step s ON f.current_step_id = s.step_id
        WHERE f.is_active_process = 1
        ORDER BY f.id DESC
    ''').fetchall()
    
    # 2. Get Statistics
    stats = conn.execute('''
        SELECT s.step_name, COUNT(f.id) as count
        FROM dim_process_step s
        LEFT JOIN fact_ongoing f ON s.step_id = f.current_step_id AND f.is_active_process = 1
        GROUP BY s.step_name
    ''').fetchall()
    
    conn.close()
    
    # Convert Row objects to dicts
    ongoing_list = [dict(row) for row in ongoing]
    stats_list = [dict(row) for row in stats]
    
    return jsonify({
        'ongoing': ongoing_list,
        'stats': stats_list
    })

@app.route('/api/contracts', methods=['POST'])
def create_contract():
    data = request.json
    name = data.get('contract_name')
    c_type = data.get('contract_type', 'Pending')
    
    if not name:
        return jsonify({'error': 'Contract name is required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO fact_ongoing (contract_name, contract_type, current_step_id, is_active_process)
        VALUES (?, ?, 1, 1)
    ''', (name, c_type))
    
    new_id = cursor.lastrowid
    
    # Initial Log
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('''
        INSERT INTO fact_process_log (ongoing_id, step_id, status_date, remarks)
        VALUES (?, 1, ?, 'Initial Request Created')
    ''', (new_id, today))
    
    conn.commit()
    conn.close()
    
    return jsonify({'id': new_id, 'message': 'Contract created successfully'}), 201

@app.route('/api/contracts/<int:id>', methods=['GET'])
def get_contract_detail(id):
    conn = get_db()
    
    contract = conn.execute('''
        SELECT f.*, s.step_name 
        FROM fact_ongoing f
        JOIN dim_process_step s ON f.current_step_id = s.step_id
        WHERE f.id = ?
    ''', (id,)).fetchone()
    
    if not contract:
        conn.close()
        return jsonify({'error': 'Contract not found'}), 404
        
    logs = conn.execute('''
        SELECT l.*, s.step_name 
        FROM fact_process_log l
        JOIN dim_process_step s ON l.step_id = s.step_id
        WHERE l.ongoing_id = ?
        ORDER BY l.status_date DESC, l.log_id DESC
    ''', (id,)).fetchall()
    
    steps = conn.execute('SELECT * FROM dim_process_step').fetchall()
    
    conn.close()
    
    return jsonify({
        'contract': dict(contract),
        'logs': [dict(row) for row in logs],
        'steps': [dict(row) for row in steps]
    })

@app.route('/api/contracts/<int:id>/update', methods=['PUT'])
def update_contract_details(id):
    data = request.json
    new_name = data.get('contract_name')
    new_type = data.get('contract_type')
    
    conn = get_db()
    conn.execute('''
        UPDATE fact_ongoing 
        SET contract_name = ?, contract_type = ? 
        WHERE id = ?
    ''', (new_name, new_type, id))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Contract updated'})

@app.route('/api/contracts/<int:id>/log', methods=['POST'])
def log_step(id):
    data = request.json
    step_id = data.get('step_id')
    remarks = data.get('remarks')
    custom_date = data.get('custom_date') or datetime.now().strftime('%Y-%m-%d')
    
    conn = get_db()
    conn.execute('UPDATE fact_ongoing SET current_step_id = ? WHERE id = ?', (step_id, id))
    conn.execute('''
        INSERT INTO fact_process_log (ongoing_id, step_id, status_date, remarks)
        VALUES (?, ?, ?, ?)
    ''', (id, step_id, custom_date, remarks))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Step logged successfully'})

@app.route('/api/contracts/<int:id>/finalize', methods=['POST'])
def finalize_contract(id):
    data = request.json
    legal_number = data.get('contract_number')
    effective_date = data.get('effective_date') # Expecting YYYY-MM-DD
    
    conn = get_db()
    c = conn.cursor()
    
    ongoing = c.execute('SELECT * FROM fact_ongoing WHERE id = ?', (id,)).fetchone()
    if not ongoing:
        return jsonify({'error': 'Contract not found'}), 404

    master_id = None
    version = 1
    
    if ongoing['parent_contract_id']:
        parent = c.execute('''
            SELECT master_id, contract_version 
            FROM fact_active_contract 
            WHERE contract_id = ?
        ''', (ongoing['parent_contract_id'],)).fetchone()
        if parent:
            master_id = parent['master_id']
            version = parent['contract_version'] + 1
    
    if not master_id:
        c.execute('INSERT INTO dim_master_contract (base_contract_number) VALUES (?)', (legal_number,))
        master_id = c.lastrowid
        version = 1
        
    c.execute('''
        INSERT INTO fact_active_contract 
        (master_id, ongoing_id, contract_number, contract_version, contract_name, contract_type, effective_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (master_id, id, legal_number, version, ongoing['contract_name'], ongoing['contract_type'], effective_date))
    
    c.execute('UPDATE fact_ongoing SET is_active_process = 0 WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Contract finalized and activated'})

@app.route('/api/active', methods=['GET'])
def get_active_contracts():
    conn = get_db()
    contracts = conn.execute('SELECT * FROM fact_active_contract ORDER BY contract_number, contract_version').fetchall()
    conn.close()
    return jsonify([dict(row) for row in contracts])

@app.route('/api/active/<int:active_id>/amend', methods=['POST'])
def amend_contract(active_id):
    conn = get_db()
    active = conn.execute('SELECT * FROM fact_active_contract WHERE contract_id = ?', (active_id,)).fetchone()
    
    if not active:
        return jsonify({'error': 'Active contract not found'}), 404
        
    new_name = f"Amendment to {active['contract_name']}"
    
    c = conn.cursor()
    c.execute('''
        INSERT INTO fact_ongoing (contract_name, contract_type, current_step_id, parent_contract_id, is_active_process)
        VALUES (?, 'Amendment', 1, ?, 1)
    ''', (new_name, active_id))
    new_id = c.lastrowid
    
    today = datetime.now().strftime('%Y-%m-%d')
    c.execute('''
        INSERT INTO fact_process_log (ongoing_id, step_id, status_date, remarks)
        VALUES (?, 1, ?, 'Amendment Process Initiated')
    ''', (new_id, today))
    conn.commit()
    conn.close()
    
    return jsonify({'id': new_id, 'message': 'Amendment process started'}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
