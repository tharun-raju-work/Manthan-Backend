const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Category = require('./Category');
const Tag = require('./Tag');
const Group = require('./Group');

// Define relationships
User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

Post.hasMany(Comment, { foreignKey: 'post_id' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Post, { foreignKey: 'category_id' });
Post.belongsTo(Category, { foreignKey: 'category_id' });

// Many-to-Many relationships
Post.belongsToMany(Tag, { through: 'post_tags', foreignKey: 'post_id' });
Tag.belongsToMany(Post, { through: 'post_tags', foreignKey: 'tag_id' });

User.belongsToMany(Group, { through: 'user_groups', foreignKey: 'user_id' });
Group.belongsToMany(User, { through: 'user_groups', foreignKey: 'group_id' });

module.exports = {
  User,
  Post,
  Comment,
  Category,
  Tag,
  Group,
};
