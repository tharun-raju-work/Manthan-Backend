const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 30]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profile_picture: DataTypes.STRING,
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: [['user', 'admin', 'moderator']]
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login: DataTypes.DATE,
    deleted_at: DataTypes.DATE,
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    githubId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password_hash')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      }
    },
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

  // Instance methods
  User.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
  };

  // Static methods
  User.associate = function(models) {
    User.hasMany(models.Post, {
      foreignKey: 'user_id',
      as: 'posts'
    });
    
    User.belongsToMany(models.Group, {
      through: 'UserGroups',
      foreignKey: 'user_id',
      as: 'groups'
    });
  };

  return User;
};
