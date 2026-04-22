import re

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to User
content = re.sub(
    r'(assetlocationlog\s+AssetLocationLog\[\]\n)(?!.*auditlog\s+AuditLog\[\])', 
    r'\1  auditlog                 AuditLog[]\n', 
    content, 
    count=1
)

# Add to Warehouse
content = re.sub(
    r'(inventorylog\s+InventoryLog\[\]\n)(?!.*auditlog\s+AuditLog\[\])', 
    r'\1  auditlog                                               AuditLog[]\n', 
    content, 
    count=1
)

audit_log_model = '''
model AuditLog {
  id          Int      @id @default(autoincrement())
  action      String   
  status      String   
  userId      Int?     
  warehouseId Int?     
  message     String   @db.Text 
  details     String?  @db.Text 
  createdAt   DateTime @default(now())

  user        User?      @relation(fields: [userId], references: [id])
  warehouse   Warehouse? @relation(fields: [warehouseId], references: [id])

  @@index([userId])
  @@index([warehouseId])
  @@map("auditlog")
}
'''

if "model AuditLog" not in content:
    content += audit_log_model

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
