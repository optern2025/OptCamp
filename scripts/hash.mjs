import argon2 from "argon2";

async function run() {
  const hash = await argon2.hash("1234567w");
  console.log(hash);
}

run();
