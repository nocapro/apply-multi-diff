add test case for below

--- test/unit/Schema/ColumnHelpers.test.ts
+++ test/unit/Schema/ColumnHelpers.test.ts
@@ -163,7 +163,8 @@
         default: defaultFn,
       },
       _tsType: false, // Should be boolean
-      expect(boolCol.options?.default).toBe(defaultFn);
+    });
+    expect(boolCol.options?.default).toBe(defaultFn);
   });

   it('should create a valid object column definition', () => {

===

prepare the lib for npm publishing to

1. https://www.npmjs.com/package/apply-multi-diff
2. with https://github.com/nocapro/apply-multi-diff
3. the name is apply-multi-diff
4. use tsup
5. emphazie zero deps
