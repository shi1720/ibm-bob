-- Original synthetic orders, shared by the HTTP sample and contract generator.
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL CHECK (length(customer) BETWEEN 1 AND 120),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
);
INSERT INTO orders (id, customer, total_cents) VALUES
  (201, 'Synthetic Paper Company', 18900),
  (202, 'Synthetic Ceramic Studio', 7900),
  (203, 'Synthetic Map Shop', 21900);
