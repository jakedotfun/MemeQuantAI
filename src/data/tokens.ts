export interface Token {
  rank: number;
  name: string;
  symbol: string;
  color: string;
  price: string;
  age: string;
  txns: string;
  volume: string;
  makers: string;
  h1: number;
  h24: number;
  liquidity: string;
  mcap: string;
}

export const tokens: Token[] = [
  { rank: 1, name: "dogwifhat", symbol: "WIF", color: "#f59e0b", price: "$2.45", age: "8mo", txns: "89.3K", volume: "$12.7M", makers: "2,891", h1: -2.1, h24: 8.4, liquidity: "$3.2M", mcap: "$2.4B" },
  { rank: 2, name: "Bonk", symbol: "BONK", color: "#f97316", price: "$0.0000312", age: "1y", txns: "67.8K", volume: "$8.9M", makers: "1,756", h1: 1.3, h24: -4.2, liquidity: "$2.8M", mcap: "$1.9B" },
  { rank: 3, name: "Popcat", symbol: "POPCAT", color: "#ec4899", price: "$1.12", age: "10mo", txns: "38.9K", volume: "$5.1M", makers: "987", h1: -0.8, h24: 15.3, liquidity: "$1.5M", mcap: "$1.1B" },
  { rank: 4, name: "Moo Deng", symbol: "MOODENG", color: "#8b5cf6", price: "$0.0521", age: "3mo", txns: "52.1K", volume: "$7.3M", makers: "1,432", h1: 12.4, h24: 34.7, liquidity: "$2.1M", mcap: "$521M" },
  { rank: 5, name: "Goat", symbol: "GOAT", color: "#6366f1", price: "$0.892", age: "4mo", txns: "31.4K", volume: "$4.2M", makers: "876", h1: -3.5, h24: -8.9, liquidity: "$1.2M", mcap: "$892M" },
  { rank: 6, name: "Fwog", symbol: "FWOG", color: "#22c55e", price: "$0.0234", age: "2mo", txns: "28.7K", volume: "$3.8M", makers: "654", h1: 6.1, h24: 18.2, liquidity: "$890K", mcap: "$234M" },
  { rank: 7, name: "Retardio", symbol: "RETARDIO", color: "#ef4444", price: "$0.456", age: "5mo", txns: "19.3K", volume: "$2.1M", makers: "432", h1: -1.2, h24: 4.5, liquidity: "$670K", mcap: "$456M" },
  { rank: 8, name: "Peanut", symbol: "PNUT", color: "#d97706", price: "$0.0891", age: "1mo", txns: "42.6K", volume: "$5.8M", makers: "1,098", h1: 15.3, h24: 42.1, liquidity: "$1.8M", mcap: "$891M" },
  { rank: 9, name: "Chill Guy", symbol: "CHILLGUY", color: "#14b8a6", price: "$0.0342", age: "2mo", txns: "15.8K", volume: "$1.9M", makers: "345", h1: 2.8, h24: -2.1, liquidity: "$420K", mcap: "$342M" },
  { rank: 10, name: "Giga Chad", symbol: "GIGA", color: "#f43f5e", price: "$0.0156", age: "7mo", txns: "22.1K", volume: "$2.7M", makers: "567", h1: -4.2, h24: -11.3, liquidity: "$560K", mcap: "$156M" },
  { rank: 11, name: "SPX6900", symbol: "SPX6900", color: "#0ea5e9", price: "$1.34", age: "9mo", txns: "34.5K", volume: "$4.5M", makers: "789", h1: 3.4, h24: 9.8, liquidity: "$1.1M", mcap: "$1.3B" },
  { rank: 12, name: "Michi", symbol: "MICHI", color: "#a855f7", price: "$0.0067", age: "3mo", txns: "12.3K", volume: "$1.4M", makers: "234", h1: 7.9, h24: 21.4, liquidity: "$310K", mcap: "$67M" },
  { rank: 13, name: "Neiro", symbol: "NEIRO", color: "#eab308", price: "$0.00234", age: "4mo", txns: "18.9K", volume: "$2.3M", makers: "456", h1: -5.6, h24: -14.2, liquidity: "$480K", mcap: "$234M" },
  { rank: 14, name: "Jupiter", symbol: "JUP", color: "#6366f1", price: "$0.892", age: "1y", txns: "78.2K", volume: "$9.1M", makers: "2,134", h1: 1.8, h24: 6.3, liquidity: "$3.8M", mcap: "$1.2B" },
];

export const tokenLogos: Record<string, string> = {
  PEPE: "/tokens/pepe.jpeg",
  WIF: "/tokens/wif.jpg",
  BONK: "/tokens/bonk.jpg",
  POPCAT: "/tokens/popcat.jpg",
  MOODENG: "/tokens/moodeng.jpg",
  GOAT: "/tokens/goat.jpg",
  FWOG: "/tokens/fwog.png",
  RETARDIO: "/tokens/retardio.png",
  PNUT: "/tokens/pnut.png",
  CHILLGUY: "/tokens/chillguy.jpg",
  GIGA: "/tokens/giga.png",
  SPX6900: "/tokens/spx6900.png",
  MICHI: "/tokens/michi.webp",
  NEIRO: "/tokens/neiro.webp",
  JUP: "/tokens/jup.png",
};

export interface SearchTokenExtras {
  contractAddress: string;
  holders: string;
}

export const searchTokenExtras: Record<string, SearchTokenExtras> = {
  PEPE: { contractAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", holders: "182.4K" },
  WIF: { contractAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", holders: "156.2K" },
  BONK: { contractAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", holders: "891.3K" },
  POPCAT: { contractAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", holders: "45.6K" },
  MOODENG: { contractAddress: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY", holders: "78.9K" },
  GOAT: { contractAddress: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump", holders: "34.2K" },
  FWOG: { contractAddress: "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump", holders: "23.1K" },
  RETARDIO: { contractAddress: "6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx", holders: "12.4K" },
  PNUT: { contractAddress: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump", holders: "67.8K" },
  CHILLGUY: { contractAddress: "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump", holders: "19.5K" },
  GIGA: { contractAddress: "63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9", holders: "28.7K" },
  SPX6900: { contractAddress: "J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr", holders: "41.3K" },
  MICHI: { contractAddress: "5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp", holders: "15.2K" },
  NEIRO: { contractAddress: "HiaBDFSsF7bCo21BG6DRz2P67YzoMYRikXL5RrJpump", holders: "22.8K" },
  JUP: { contractAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", holders: "312.5K" },
};

export interface SearchToken extends Token {
  contractAddress: string;
  holders: string;
}

export function getSearchTokens(): SearchToken[] {
  return tokens.map((token) => ({
    ...token,
    ...searchTokenExtras[token.symbol],
  }));
}
