const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 255]
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'published', 'archived']]
      }
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'posts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  Post.associate = function(models) {
    Post.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    Post.belongsToMany(models.Tag, {
      through: 'PostTags',
      foreignKey: 'post_id',
      as: 'tags'
    });
  };

  return Post;
};
