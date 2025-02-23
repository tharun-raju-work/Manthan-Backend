const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50],
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  profile_picture: DataTypes.STRING(255),
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'user',
    validate: {
      isIn: [['user', 'researcher', 'volunteer', 'admin']],
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login: DataTypes.DATE,
  deleted_at: DataTypes.DATE,
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true, // Enables soft deletes
  indexes: [
    {
      fields: ['email'],
      unique: true,
    },
    {
      fields: ['username'],
      unique: true,
    },
    {
      fields: ['role'],
    },
  ],
});

module.exports = User;
