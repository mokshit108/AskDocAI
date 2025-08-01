const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Document = require('./Document');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Document,
      key: 'id'
    }
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  citations: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'chats',
  timestamps: true
});

// Define associations
Document.hasMany(Chat, { foreignKey: 'documentId', as: 'chats' });
Chat.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

module.exports = Chat;