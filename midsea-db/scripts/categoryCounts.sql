SELECT name,IFNULL(promptsScrapedCount,0),maxPromptsScraped,IFNULL(imagesCreatedCount,0),maxImagesCreated FROM category 
LEFT JOIN (SELECT categoryName,count(*) AS imagesCreatedCount FROM image GROUP BY categoryName) AS images ON category.name=images.categoryName 
LEFT JOIN (SELECT categoryName,count(*) AS promptsScrapedCount FROM prompt GROUP BY categoryName) AS prompts ON category.name=prompts.categoryName;

