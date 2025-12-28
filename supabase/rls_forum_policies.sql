-- =====================================================
-- RLS Policies for Forum Tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable RLS on forum_posts
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on forum_comments  
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FORUM_POSTS Policies
-- =====================================================

-- Anyone can read forum posts
DROP POLICY IF EXISTS "Public can read forum posts" ON forum_posts;
CREATE POLICY "Public can read forum posts" ON forum_posts
  FOR SELECT USING (true);

-- Authenticated users can create posts
DROP POLICY IF EXISTS "Users can create posts" ON forum_posts;
CREATE POLICY "Users can create posts" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
CREATE POLICY "Users can update own posts" ON forum_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;
CREATE POLICY "Users can delete own posts" ON forum_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can manage all posts
DROP POLICY IF EXISTS "Admin can manage all posts" ON forum_posts;
CREATE POLICY "Admin can manage all posts" ON forum_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- FORUM_COMMENTS Policies
-- =====================================================

-- Anyone can read comments
DROP POLICY IF EXISTS "Public can read comments" ON forum_comments;
CREATE POLICY "Public can read comments" ON forum_comments
  FOR SELECT USING (true);

-- Users can create comments
DROP POLICY IF EXISTS "Users can create comments" ON forum_comments;
CREATE POLICY "Users can create comments" ON forum_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own comments
DROP POLICY IF EXISTS "Users can update own comments" ON forum_comments;
CREATE POLICY "Users can update own comments" ON forum_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON forum_comments;
CREATE POLICY "Users can delete own comments" ON forum_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can manage all comments
DROP POLICY IF EXISTS "Admin can manage all comments" ON forum_comments;
CREATE POLICY "Admin can manage all comments" ON forum_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- CATEGORIES Policy (untuk AdminCategories.vue)
-- =====================================================

-- Anyone can read categories
DROP POLICY IF EXISTS "Public can read categories" ON categories;
CREATE POLICY "Public can read categories" ON categories
  FOR SELECT USING (true);

-- Only admin can manage categories
DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
CREATE POLICY "Admin can manage categories" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Verification
-- =====================================================
-- Run these to verify policies are created:
-- SELECT * FROM pg_policies WHERE tablename = 'forum_posts';
-- SELECT * FROM pg_policies WHERE tablename = 'forum_comments';
-- SELECT * FROM pg_policies WHERE tablename = 'categories';
