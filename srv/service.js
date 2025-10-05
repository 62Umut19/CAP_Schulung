const cds = require("@sap/cds");

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
            article._ProductDescription = article._ProductDescription.map(desc => ({
              Product: desc.Product,
              Language: desc.Language,
              ProductDescription: desc.ProductDescription
            }));
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
        ['article_number', 'discrepancyExists'].forEach((element) => {
            if (
                !req.query.SELECT.columns.find((column) =>
                    column.ref?.find((ref) => ref == element)
                )
            ) {
                req.query.SELECT.columns.push({ ref: [element] });
            }
        })

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
                                article._ProductDescription = article._ProductDescription.map(desc => ({
                                    Product: desc.Product,
                                    Language: desc.Language,
                                    ProductDescription: desc.ProductDescription
                                }));
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
            console.log(error)
        }
    });
});
