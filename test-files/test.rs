fn main() {
    println!("Hello from Rust");
    let numbers = vec![1, 2, 3, 4, 5];
    for n in &numbers {
        println!("Number: {}", n);
    }
}