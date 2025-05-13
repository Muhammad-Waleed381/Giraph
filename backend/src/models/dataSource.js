import mongoose from 'mongoose';

const dataSourceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['csv', 'excel', 'google_sheets', 'database', 'json']
  },
  collection_name: {
    type: String,
    required: true
  },
  connection_details: {
    type: Object,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  last_updated: {
    type: Date,
    default: Date.now,
    required: true
  },
  row_count: {
    type: Number
  },
  file_info: {
    original_filename: String,
    file_size: Number,
    upload_id: String
  },
  google_sheet_info: {
    spreadsheet_id: String,
    sheet_name: String
  },
  schema_metadata: {
    type: Object,
    default: {}
  }
});

// Create indexes
dataSourceSchema.index({ user_id: 1 });
dataSourceSchema.index({ collection_name: 1 });
dataSourceSchema.index({ type: 1 });

const DataSource = mongoose.model('data_sources', dataSourceSchema);

export default DataSource; 