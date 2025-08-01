const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalPages: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  extractedText: {
    type: DataTypes.TEXT
  },
  // Store pages data for fallback search
  pagesData: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  vectorized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('uploading', 'processing', 'ready', 'error'),
    defaultValue: 'uploading'
  }
}, {
  tableName: 'documents',
  timestamps: true
});

module.exports = Document;