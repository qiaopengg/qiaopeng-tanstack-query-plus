
import { QueryClient } from "@tanstack/react-query";
import { syncEntityAcrossFamilyOptimistic, DEFAULT_FAMILY_SYNC } from "./src/utils/consistency";

async function reproBug() {
  const queryClient = new QueryClient();

  // 模拟场景：ID 类型不一致
  // 缓存中的数据 ID 是 number
  const key1 = ['indicators', 'list', { page: 1, pageSize: 20 }];
  const data1 = { items: [{ id: 1, name: "Old Name" }] };
  queryClient.setQueryData(key1, data1);

  // 模拟 Mutation 传入的 Payload ID 是 string (例如从 URL 或 Form 获取)
  const payload = { id: "1", name: "New Name" };
  const familyKey = ['indicators', 'list'];

  console.log("Testing ID Type Mismatch (String vs Number)...");
  
  const rollbackData = syncEntityAcrossFamilyOptimistic(
    queryClient,
    familyKey,
    DEFAULT_FAMILY_SYNC,
    "update",
    payload as any
  );

  const data1After = queryClient.getQueryData(key1) as any;
  console.log("Result Name:", data1After.items[0].name);

  if (data1After.items[0].name === "New Name") {
    console.log("[SUCCESS] Updated despite type mismatch.");
  } else {
    console.log("[FAILURE] Failed to update due to type mismatch.");
  }

  // 模拟场景：对象键顺序不一致
  console.log("\nTesting Object Key Order Mismatch...");
  const key2 = ['users', 'list', { a: 1, b: 2 }];
  queryClient.setQueryData(key2, { items: [{ id: 1, name: "Old User" }] });

  const familyPrefix2 = ['users', 'list']; 
  // 这里如果 derive 出来的 prefix 是 ['users', 'list']，那应该能匹配。
  // 但如果 prefix 本身包含对象呢？
  const key3 = ['users', 'details', { type: 'admin', role: 'super' }];
  queryClient.setQueryData(key3, { items: [{ id: 1, name: "Old Admin" }] });
  
  // 假设 familyKey 是 ['users', 'details', { role: 'super', type: 'admin' }] (顺序颠倒)
  const familyPrefix3 = ['users', 'details', { role: 'super', type: 'admin' }];

  const rollbackData3 = syncEntityAcrossFamilyOptimistic(
    queryClient,
    familyPrefix3,
    DEFAULT_FAMILY_SYNC,
    "update",
    { id: 1, name: "New Admin" }
  );
  
  const data3After = queryClient.getQueryData(key3) as any;
  console.log("Result User:", data3After.items[0].name);
   if (data3After.items[0].name === "New Admin") {
    console.log("[SUCCESS] Updated despite key order mismatch.");
  } else {
    console.log("[FAILURE] Failed to update due to key order mismatch.");
  }

}

reproBug();
