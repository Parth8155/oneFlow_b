const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Initialize database connection
const db = require('./models');
db.sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const projectRoutes = require('./routes/projects');
app.use('/api/projects', projectRoutes);

const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);

const timesheetRoutes = require('./routes/timesheets');
app.use('/api/timesheets', timesheetRoutes);

const salesOrderRoutes = require('./routes/salesOrderRoutes');
app.use('/api/sales-orders', salesOrderRoutes);

const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
app.use('/api/purchase-orders', purchaseOrderRoutes);

const customerInvoiceRoutes = require('./routes/customerInvoiceRoutes');
app.use('/api/customer-invoices', customerInvoiceRoutes);

const vendorBillRoutes = require('./routes/vendorBillRoutes');
app.use('/api/vendor-bills', vendorBillRoutes);

const expenseRoutes = require('./routes/expenseRoutes');
app.use('/api/expenses', expenseRoutes);

const financialRoutes = require('./routes/financialRoutes');
app.use('/api/financial', financialRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});