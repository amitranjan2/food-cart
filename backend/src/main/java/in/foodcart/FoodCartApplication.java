package in.foodcart;
import org.springframework.boot.SpringApplication; import org.springframework.boot.autoconfigure.SpringBootApplication; import org.springframework.scheduling.annotation.EnableScheduling;
@SpringBootApplication @EnableScheduling public class FoodCartApplication { public static void main(String[] args){SpringApplication.run(FoodCartApplication.class,args);} }
