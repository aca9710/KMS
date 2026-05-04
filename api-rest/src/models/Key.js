const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Key = sequelize.define('Key', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  client_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  algorithm: {
    type: DataTypes.STRING,
    allowNull: false
  },
  purpose: {
    type: DataTypes.STRING,
    allowNull: false
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  encrypted_private_key: {
    type: DataTypes.BLOB,
    allowNull: false
  },
  public_key_hex: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  revocation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  key_metadata: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'keys',
  timestamps: false,
  underscored: true
});

module.exports = Key;
