import "./Popup.css";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useState, useEffect, useRef } from "react";
import { BeatLoader } from "react-spinners";

import github from "@/assets/github.svg";

interface PageInfo {
  canonicalUrl: string | null;
  errorMessage: string | null;
  message: string | null;
  hasSitefinity: boolean;
  tab: chrome.tabs.Tab | null;
}

function Popup() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    canonicalUrl: null,
    errorMessage: null,
    message: null,
    hasSitefinity: false,
    tab: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Avoids stale closure in useEffect
  // pageInfo is updated in the useEffect ∴ can't use it directly in the sendMessage (pageInfo.tab.id)
  const tabIDRef = useRef<number | undefined>();

  useEffect(() => {
    async function getTabUrl(): Promise<string | null> {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!tab?.url) return null;
        tabIDRef.current = tab?.id;

        setPageInfo((prev) => ({ ...prev, tab }));

        const url = new URL(tab.url);
        return `${url.protocol}//${url.hostname}`;
      } catch (error) {
        console.error("Get tab error:", error);
        return null;
      }
    }

    async function hasSitefinityGenerator(): Promise<boolean> {
      try {
        if (!tabIDRef.current) {
          setPageInfo((prev) => ({
            ...prev,
            errorMessage: "No tab id found!",
          }));
          return false;
        }

        const [injectionResult] = await chrome.scripting.executeScript({
          target: { tabId: tabIDRef.current },
          func: () => {
            const generatorMeta = document.querySelector(
              'meta[name="Generator"]'
            );

            const generator = generatorMeta
              ? generatorMeta.getAttribute("content")
              : null;

            return generator;
          },
        });

        const generator = injectionResult.result;

        if (!generator) return false;

        if (!generator.match(/sitefinity/i)) return false;

        setPageInfo((prev) => ({ ...prev, hasSitefinity: true }));
        return true;
      } catch (error) {
        console.error("Generator check error:", error);
        setPageInfo((prev) => ({
          ...prev,
          errorMessage: "Generator check error!",
        }));
        return false;
      }
    }

    async function getCanonicalUrl() {
      try {
        if (!tabIDRef.current){
          setPageInfo((prev) => ({
            ...prev,
            errorMessage: "No tab id found!",
          }));
          return;
        };

        const [injectionResult] = await chrome.scripting.executeScript({
          target: { tabId: tabIDRef.current },
          func: () => {
            const canonicalLink = document.querySelector(
              'link[rel="canonical"]'
            );

            const canonicalUrl = canonicalLink
              ? canonicalLink.getAttribute("href")
              : null;

            return canonicalUrl;
          },
        });

        const canonicalUrl = injectionResult.result;

        if (!canonicalUrl) {
          setPageInfo((prev) => ({
            ...prev,
            errorMessage: "No canonical URL found on this page!",
          }));
          return;
        }

        setPageInfo((prev) => ({
          ...prev,
          canonicalUrl: canonicalUrl,
          message: `URL found: ${canonicalUrl}`,
        }));
      } catch (error) {
        console.error("Canonical URL error:", error);
        setPageInfo((prev) => ({
          ...prev,
          errorMessage: "Failed to get canonical URL!",
        }));
      }
    }

    async function checkSitefinity(baseURL: string) {
      try {
        const response = await fetch(`${baseURL}/sitefinity`);
        if (!response.ok) {
          setPageInfo((prev) => ({
            ...prev,
            errorMessage: "Sitefinity CMS not found on this domain!",
          }));
          return false;
        }
        setPageInfo((prev) => ({ ...prev, hasSitefinity: true }));
        return true
      } catch (error) {
        console.error("Sitefinity check error:", error);
        setPageInfo((prev) => ({
          ...prev,
          errorMessage: "Failed to check for Sitefinity!",
        }));
      }
    }

    async function init() {
      try {
        const baseURL = await getTabUrl();
        if (!baseURL) {
          setPageInfo((prev) => ({
            ...prev,
            errorMessage: "Failed to get tab URL!",
          }));
          setIsLoading(false);
          return;
        }

        const hasGenerator = await hasSitefinityGenerator();

        if (hasGenerator) {
          await getCanonicalUrl();
        } else {
          const hasSitefinity = await checkSitefinity(baseURL);
          // Only get canonical URL if checkSitefinity succeeded
          if (hasSitefinity) {
            await getCanonicalUrl();
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Init error:", error);
        setPageInfo((prev) => ({
          ...prev,
          errorMessage: "Failed to initialize!",
        }));
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const handleClick = (type: string) => {
    // Check if canonicalUrl ends in just the domain (root page)
    const isRootPage = pageInfo.canonicalUrl?.match(/^https?:\/\/[^/]+\/?$/);
    
    const newUrl = isRootPage
      ? type === "edit"
        ? `${pageInfo.canonicalUrl}/home/action/edit`.replace(/\/+/g, '/') // Replace multiple slashes with single
        : `${pageInfo.canonicalUrl}/home/action/preview`.replace(/\/+/g, '/')
      : type === "edit"
        ? pageInfo.canonicalUrl?.concat("/action/edit")
        : pageInfo.canonicalUrl?.concat("/action/preview");
  
    chrome.tabs.create({ url: newUrl });
  };

  return (
    <main className="h-[100vh] w-[100vw] flex flex-col justify-center items-center">
      <Card className="w-[300px] h-fit min-h-[200px] mx-auto bg-transparent flex items-center flex-col gap-[1rem] text-white border-none ">
        <CardHeader>
          <CardTitle className="text-center flex flex-row gap-2 items-center">
            <h1>Actions</h1>
            <img
              src="/icons/action-128.png"
              alt="Action Icon"
              className="w-6 h-6"
            />
          </CardTitle>
        </CardHeader>
        {/* Main Content */}
        <CardContent className="flex flex-row gap-[1rem]">
          {isLoading ? (
            // Loading state
            <>
              <BeatLoader color="#fff" loading={isLoading} />
            </>
          ) : pageInfo.hasSitefinity && pageInfo.canonicalUrl ? (
            // Has Sitefinity CMS & canonical URL
            <>
              <Button
                className="edit-button"
                onClick={() => handleClick("edit")}
              >
                Edit Page
              </Button>
              <Button
                className="preview-button"
                onClick={() => handleClick("preview")}
              >
                View Preview
              </Button>
            </>
          ) : (
            // No Sitefinity CMS
            <>
              <Button className="edit-button" disabled>
                Edit Page
              </Button>
              <Button className="preview-button" disabled>
                View Preview
              </Button>
            </>
          )}
        </CardContent>
        {/* Footer info */}
        <CardFooter className="flex flex-col gap-[1rem]">
          {isLoading ? (
            <p className="text-yellow-300">Checking page...</p>
          ) : pageInfo.errorMessage ||
            !pageInfo.canonicalUrl ||
            !pageInfo.hasSitefinity ? (
            <p className="text-[#EA1525]">{pageInfo.errorMessage}</p>
          ) : (
            <p className="text-green-300">{pageInfo.message}</p>
          )}
          <p className="text-xs text-[#646C6D] flex flex-row">
            Found a bug?&nbsp;
            <a
              href="https://github.com/MichOchieng/actions/issues/new"
              className="flex flex-row"
              target="blank"
            >
              {" "}
              Create an issue &nbsp;
              <img className="w-5 h-5" src={github} />
            </a>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

export default Popup;
