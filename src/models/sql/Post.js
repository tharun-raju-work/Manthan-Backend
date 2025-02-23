const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  category_id: {
    type: DataTypes.BIGINT,
    references: {
      model: 'categories',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255],
    },
  },
  description: DataTypes.TEXT,
  image_url: DataTypes.STRING(255),
  location: DataTypes.GEOMETRY('POINT', 4326),
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'in_progress', 'resolved', 'closed']],
    },
  },
  vote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  deleted_at: DataTypes.DATE,
}, {
  tableName: 'posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['category_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['created_at'],
    },
    {
      using: 'GIST',
      fields: ['location'],
    },
  ],
});

module.exports = Post;
