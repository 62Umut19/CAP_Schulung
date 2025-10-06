const cds = require("@sap/cds");
const xlsx = require("xlsx");

module.exports = cds.service.impl(async function () {
  const articlesService = await cds.connect.to("CE_PRODUCT_0002");
  const { Inventory, Articles } = this.entities;
  const getArticleTextColumn = (req) => {
    return {
      ref: ["_ProductDescription"],
      expand: ["ProductDescription", "Language"],
      where: [
        {
          xpr: [
            { ref: ["Language"] },
            "=",
            { val: req.locale?.toUpperCase() || "EN" },
            "or",
            { ref: ["Language"] },
            "=",
            { val: "EN" },
          ],
        },
      ],
    };
  };
  this.on("READ", Articles, async (req) => {
    let textIndex;
    let articleTextIndex = -1;

    if (req.query.SELECT.columns) {
      const allFieldsIndex = req.query.SELECT.columns.findIndex(
        (column) => column === "*"
      );
      if (allFieldsIndex >= 0) {
        req.query.SELECT.columns.splice(allFieldsIndex, 1);
        req.query.SELECT.columns.push(
          ...["number", "unit", "category", "text"].map((field) => {
            return { ref: [field] };
          })
        );
      }

      // Check if articleText is already requested
      articleTextIndex = req.query.SELECT.columns.findIndex(
        (column) => column.ref?.[0] === "articleText"
      );

      textIndex = req.query.SELECT.columns.findIndex(
        (column) => column?.ref?.[0] === "text"
      );

      if (textIndex >= 0) {
        req.query.SELECT.columns.splice(textIndex, 1);
        if (articleTextIndex < 0) {
          req.query.SELECT.columns.push(getArticleTextColumn(req));
          articleTextIndex = req.query.SELECT.columns.length - 1;
        }
      } else if (articleTextIndex < 0) {
        // Only add if not already present
        req.query.SELECT.columns.push(getArticleTextColumn(req));
        articleTextIndex = req.query.SELECT.columns.length - 1;
      }
    }

    const articles = await articlesService.transaction(req).send({
      query: req.query,
      headers: {
        apiKey: process.env.apikey,
      },
    });

    const articlesRes = Array.isArray(articles) ? articles : [articles];
    const articlesWithText = articlesRes.map((article) => {
      // Clean up _ProductDescription - remove SAP__Messages
      if (article._ProductDescription) {
        article._ProductDescription = article._ProductDescription.map(
          (desc) => ({
            Product: desc.Product,
            Language: desc.Language,
            ProductDescription: desc.ProductDescription,
          })
        );
      }

      if (textIndex >= 0 && article._ProductDescription) {
        article.text =
          article._ProductDescription?.find((artText) => {
            return artText.Language === req.locale?.toUpperCase();
          })?.["ProductDescription"] ||
          article._ProductDescription?.[0]?.["ProductDescription"];
      }
      return article;
    });
    return articlesWithText;
  });
  this.on("READ", [Inventory, Inventory.drafts], async (req, next) => {
    if (!req.query.SELECT.columns) return next();
    const expandIndex = req.query.SELECT.columns.findIndex(
      ({ expand, ref }) => expand && ref[0] === "article"
    );
    if (expandIndex < 0) return next();
    req.query.SELECT.columns.splice(expandIndex, 1);
    ["article_number", "discrepancyExists"].forEach((element) => {
      if (
        !req.query.SELECT.columns.find((column) =>
          column.ref?.find((ref) => ref == element)
        )
      ) {
        req.query.SELECT.columns.push({ ref: [element] });
      }
    });

    try {
      const response = await next();
      const resp = Array.isArray(response) ? response : [response];
      await Promise.all(
        resp.map(async (inventoryReconItem) => {
          if (inventoryReconItem?.article_number) {
            const article = await articlesService.transaction(req).send({
              query: SELECT.one
                .from("Product")
                .where({ Product: inventoryReconItem.article_number })
                .columns([
                  "Product as number",
                  "BaseUnit as unit",
                  "ProductGroup as category",
                  getArticleTextColumn(req),
                ]),
              headers: {
                apiKey: process.env.apikey,
              },
            });

            if (article) {
              // Clean up _ProductDescription - remove SAP__Messages
              if (article._ProductDescription) {
                article._ProductDescription = article._ProductDescription.map(
                  (desc) => ({
                    Product: desc.Product,
                    Language: desc.Language,
                    ProductDescription: desc.ProductDescription,
                  })
                );
              }

              article.text =
                article._ProductDescription?.find((artText) => {
                  return artText.Language === req.locale?.toUpperCase();
                })?.["ProductDescription"] ||
                article._ProductDescription?.[0]?.["ProductDescription"];
              inventoryReconItem.article = article;
            }
          }
        })
      );
      return resp;
    } catch (error) {
      console.log(error);
    }
  });

  this.before("CREATE", Inventory, async (req) => {
    if (Array.isArray(req.data)) {
      req.data.forEach((item) => {
        item.status_code = "O";
      });
    }
    req.data.status_code = "O";
  });

  this.on("PUT", "ExcelUpload", async (req, next) => {
    if (req.data.excel) {
      const { entity } = req.headers;
      const stream = req.data.excel;
      const buffersArray = [];
      await new Promise((resolve, reject) => {
        stream.on("data", (dataChunk) => {
          buffersArray.push(dataChunk);
        });
        stream.on("end", async () => {
          resolve();
        });
      });
      const buffer = Buffer.concat(buffersArray);
      const workbook = xlsx.read(buffer, {
        type: "buffer",
        cellText: true,
        cellDates: true,
        dateNF: 'yyyy"."mm"."dd',
        cellNF: true,
        rawNumbers: false,
      });
      const excelData = [];
      const sheets = workbook.SheetNames;
      for (let i = 0; i < sheets.length; i++) {
        const sheetData = xlsx.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[i]],
          {
            cellText: true,
            cellDates: true,
            dateNF: 'yyyy"."mm"."dd',
            rawNumbers: false,
          }
        );
        sheetData.forEach((data) => {
          excelData.push(JSON.parse(JSON.stringify(data)));
        });
      }

      const errors = [];
      if (!excelData || excelData?.length === 0) {
        errors.push({ message: "Excel file is empty" });
      }
      const mappedData = excelData.map((item, index) => {
        if (!item.article_number) {
          errors.push({
            status: 400,
            message: `article number is missing at row ${index + 1}`,
          });
        }
        if (!item.quantity) {
          errors.push({
            status: 400,
            message: `quanity is missing at row ${index + 1}`,
          });
        }
        return { article_number: item.article_number, quantity: item.quantity };
      });
      const articleNumbers = [
        ...new Set(
          mappedData.map((item) => item.article_number).filter(Boolean)
        ),
      ];
      const articleValidationRes = await validateArticles(articleNumbers);

      errors.push(...articleValidationRes.errors);

      if (errors.length > 0) {
        errors.forEach((err) => req.error(err));
        req.reject();
      }
      const insertQuery = INSERT.into(entity, mappedData);
      await this.run(insertQuery);
      req.notify({
        message: "Upload Successful",
        status: 200,
      });
    }
  });
  const validateArticles = async (articleNumbers) => {
    const errors = [];
    const foundArticles = await articlesService.send({
      query: SELECT.from(Articles).where({ number: { in: articleNumbers } }),
      headers: {
        apiKey: process.env.apikey,
      },
    });
    const foundArticleNumbers = foundArticles?.map(
      (foundArticle) => foundArticle.number
    );
    articleNumbers.forEach((articleNumber) => {
      if (!foundArticleNumbers.includes(articleNumber)) {
        errors.push({
          status: 404,
          message: `article with number ${articleNumber} does not exist`,
        });
      }
    });
    const articlesInInventory = await SELECT.from(Inventory).where({
      and: {
        article_number: { in: articleNumbers },
        status_code: { in: ["O", "W"] },
      },
    });
    articlesInInventory.forEach((item) => {
      errors.push({
        status: 400,
        message: `There is already an open/invalid status entry for article with number ${item.article_number}`,
      });
    });
    return { errors };
  };
});
