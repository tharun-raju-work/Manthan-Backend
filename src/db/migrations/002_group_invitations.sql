-- Group Invitations table
CREATE TABLE group_invitations (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL,
  inviter_id BIGINT NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitation_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitation_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_invitation_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- Indexes
CREATE INDEX idx_group_invitations_token ON group_invitations(token);
CREATE INDEX idx_group_invitations_email ON group_invitations(invited_email);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_group_invitations_expires ON group_invitations(expires_at);

-- Update trigger
CREATE TRIGGER update_group_invitations_updated_at
  BEFORE UPDATE ON group_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 